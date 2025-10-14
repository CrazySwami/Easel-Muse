'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { NodeLayout } from '@/components/nodes/layout';
import type { ChatNodeProps, ChatSession, UIMessage } from './index';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModelSelector } from '../model-selector';
import { useGateway } from '@/providers/gateway/client';
import { nanoid } from 'nanoid';
import { PlusIcon, Trash2Icon, GlobeIcon, RefreshCcwIcon, CopyIcon, PaperclipIcon, MicIcon } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useReactFlow } from '@xyflow/react';
import { useSelf, useOthers, useUpdateMyPresence } from '@liveblocks/react';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Actions, Action } from '@/components/ai-elements/actions';
import { Response } from '@/components/ai-elements/response';
import { Sources, SourcesContent, SourcesTrigger, Source } from '@/components/ai-elements/sources';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { Loader } from '@/components/ai-elements/loader';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAnalytics } from '@/hooks/use-analytics';
import { mutate } from 'swr';


type ChatPanelProps = {
  nodeId: string;
  sessionId: string;
  model: string;
  webSearch: boolean;
  sessions: ChatSession[];
  renameSessionIfNeeded: (sessId: string, firstUserText: string) => void;
  updateNodeData: ReturnType<typeof useReactFlow>['updateNodeData'];
  modelsMap: Record<string, any>;
};

const ChatPanel = ({ nodeId, sessionId, model, webSearch, sessions, renameSessionIfNeeded, updateNodeData, modelsMap }: ChatPanelProps) => {
  const { messages, status, sendMessage, regenerate, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onFinish: () => {
      setTimeout(() => mutate('credits'), 3000);
    }
  });
  const me = useSelf();
  const others = useOthers();
  const updatePresence = useUpdateMyPresence();
  const analytics = useAnalytics();
  const myId = me?.id;
  const myAvatar = (me?.info as any)?.avatar as string | undefined;
  const [input, setInput] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const getDefaultModel = (ms: Record<string, any>) => {
    if (ms['gpt-5-mini']) return 'gpt-5-mini';
    const entry = Object.entries(ms).find(([id]) => id.includes('gpt-5') || id.includes('mini'));
    return entry?.[0] ?? Object.keys(ms)[0];
  };
  const [selectedModel, setSelectedModel] = useState<string>(model || getDefaultModel(modelsMap || {}));
  const [search, setSearch] = useState<boolean>(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [listening, setListening] = useState<boolean>(false);
  const recognitionRef = (typeof window !== 'undefined') ? (window as any).__chatRecognitionRef || { current: null } : { current: null };
  if (typeof window !== 'undefined') { (window as any).__chatRecognitionRef = recognitionRef; }
  const micBaseInputRef = useRef<string>('');
  const micLastIndexRef = useRef<number>(-1);
  const lastHydratedSessionIdRef = useRef<string | null>(null);

  // Sync to node data for this session; avoid overwriting saved history with empty while switching
  useEffect(() => {
    try {
      if (sessionId && lastHydratedSessionIdRef.current !== sessionId) {
        const savedForSession = (sessions.find((s) => s.id === sessionId)?.messages ?? []) as any[];
        if (savedForSession.length) {
          setMessages(savedForSession as any);
        }
        lastHydratedSessionIdRef.current = sessionId;
      }
    } catch {}
    // Auto-name by first user message (local view ok; persisted separately on assistant finish below)
    const firstUser = messages.find((m) => m.role === 'user');
    if (firstUser) {
      const text = (firstUser.parts ?? []).map((p: any) => (p.type === 'text' ? p.text : '')).join(' ').trim();
      renameSessionIfNeeded(sessionId, text);
    }
    // Push latest assistant text to output for wiring
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant) {
      const text = (lastAssistant.parts ?? []).map((p: any) => (p.type === 'text' ? p.text : '')).join(' ').trim();
      if (text) updateNodeData(nodeId, { outputTexts: [text] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, sessionId]);

  useEffect(() => {
    if (status !== 'ready') return;
    const last = messages[messages.length - 1] as any;
    if (!last) return;
    if (last.role === 'assistant') {
      // Append assistant to shared storage if not already present
      const sess = sessions.find((s) => s.id === sessionId);
      const has = (sess?.messages ?? []).some((m: any) => m.id === last.id);
      if (!has) {
        const nextSessions = sessions.map((s) =>
          s.id === sessionId ? { ...s, updatedAt: Date.now(), messages: [ ...(s.messages ?? []), { ...last, createdAt: Date.now() } as any ] } : s
        );
        updateNodeData(nodeId, { sessions: nextSessions });
      }
      // If assistant emitted binary images, upload and replace with URLs
      const imageParts = (last.parts ?? []).filter((p: any) => p.type === 'image' && p.image instanceof ArrayBuffer);
      if (imageParts.length > 0) {
        (async () => {
          const uploadedParts = await Promise.all(
            imageParts.map(async (p: any) => {
              try {
                const r = await fetch('/api/upload', { method: 'POST', body: p.image });
                const { url } = await r.json();
                return { ...p, image: url };
              } catch {
                return p; // Keep original on error
              }
            })
          );
          const sess2 = sessions.find((s) => s.id === sessionId);
          if (!sess2) return;
          const nextMessages = (sess2.messages ?? []).map((m: any) =>
            m.id === last.id
              ? { ...m, parts: m.parts.map((p: any) => {
                  const match = uploadedParts.find((up) => up.type === p.type && (up.image === p.image || up === p));
                  return match || p;
                }) }
              : m
          );
          const nextSessions = sessions.map((s) => (s.id === sessionId ? { ...s, messages: nextMessages as any } : s));
          updateNodeData(nodeId, { sessions: nextSessions });
        })();
      }
    }
  }, [status, messages, sessions, sessionId, nodeId, updateNodeData]);

  useEffect(() => {
    const nowTyping = Boolean(input);
    updatePresence({ typing: nowTyping, draftText: input });
    const t = setTimeout(() => updatePresence({ typing: false }), 800);
    // Detect @mention context (simple trailing token analysis)
    try {
      const match = input.match(/(^|\s)@(\w*)$/);
      if (match) {
        setMentionQuery(match[2] || '');
        setShowMentions(true);
      } else {
        setShowMentions(false);
        setMentionQuery(null);
      }
    } catch {}
    return () => clearTimeout(t);
  }, [input, updatePresence]);

  const [isSending, setIsSending] = useState(false);
  const mentionsAIInInput = useMemo(() => /(^|\s)@(ai|assistant|bot)\b/i.test(input), [input]);

  // Prefer persisted session messages for display so switching sessions shows history
  const session = sessions.find((s) => s.id === sessionId);
  // Prefer session messages; if streaming has begun and new tokens are arriving, merge by id
  const displayMessages = ((): any[] => {
    const saved = (session?.messages ?? []) as any[];
    const liveArr = (messages as any[]) ?? [];
    if (saved.length === 0) return liveArr;
    // Merge: prefer saved order, overlay any live with same id, then append new live ids
    const liveById = new Map(liveArr.map((m) => [m.id, m]));
    const seen = new Set<string>();
    const merged: any[] = saved.map((m) => {
      seen.add(m.id);
      return liveById.get(m.id) ?? m;
    });
    for (const m of liveArr) {
      if (!seen.has(m.id)) merged.push(m);
    }
    // Stabilize order using createdAt when present
    return merged.slice().sort((a, b) => {
      const ta = (a as any).createdAt ?? 0;
      const tb = (b as any).createdAt ?? 0;
      return ta - tb;
    });
  })();

  // Guard against accidental overwrites of history with fewer/empty messages
  const lastSavedCountRef = useRef<number>(session?.messages?.length ?? 0);
  useEffect(() => {
    const current = (messages ?? []).length;
    if (current === 0) return; // never overwrite with empty
    if ((session?.messages?.length ?? 0) > current) return; // don't replace with fewer
    lastSavedCountRef.current = current;
  }, [messages, session?.messages?.length]);

  const appendToSession = (msg: any) => {
    const nextSessions = sessions.map((s) =>
      s.id === sessionId ? { ...s, updatedAt: Date.now(), messages: [ ...(s.messages ?? []), { ...msg, createdAt: Date.now() } ] } : s
    );
    updateNodeData(nodeId, { sessions: nextSessions });
  };

  const roster = useMemo(() => {
    const seen: Record<string, any> = {};
    const list: any[] = [];
    // AI pseudo-user
    list.push({ id: 'ai', name: 'AI', avatar: '/Easel-Logo.svg', isAI: true, handle: 'ai' });
    if (me) {
      const name = (me.info as any)?.name || 'Me';
      seen[me.id] = true;
      list.push({ id: me.id, name, avatar: (me.info as any)?.avatar, handle: (name as string).toLowerCase().replace(/[^a-z0-9]+/g, '') || 'me' });
    }
    for (const o of Array.from(others)) {
      if (!o?.id || seen[o.id]) continue;
      const name = (o.info as any)?.name || `User ${String(o.id).slice(-4)}`;
      seen[o.id] = true;
      list.push({ id: o.id, name, avatar: (o.info as any)?.avatar, handle: (name as string).toLowerCase().replace(/[^a-z0-9]+/g, '') });
    }
    return list;
  }, [me, others]);

  useEffect(() => {
    try {
      // Persist a simple roster set on the node for historical mentions (best-effort)
      const prev: any[] = ((sessions as any).__roster ?? ([] as any[]));
      const merged = [...prev];
      const byId = new Set(prev.map((p: any) => p.id));
      for (const r of roster) {
        if (!byId.has(r.id)) {
          merged.push({ id: r.id, name: r.name, avatar: r.avatar, handle: r.handle });
          byId.add(r.id);
        }
      }
      (sessions as any).__roster = merged;
      updateNodeData(nodeId, { sessions });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster]);

  const allMentionables = useMemo(() => {
    const persisted: any[] = ((sessions as any).__roster ?? []) as any[];
    const liveIds = new Set(roster.map((r: any) => r.id));
    const merged = [...roster];
    for (const p of persisted) {
      if (!liveIds.has(p.id)) merged.push(p);
    }
    const q = (mentionQuery || '').toLowerCase();
    return merged.filter((p) => !q || (p.name as string).toLowerCase().includes(q) || (p.handle as string).includes(q));
  }, [roster, sessions, mentionQuery]);

  const insertMention = (m: any) => {
    try {
      setInput((prev) => prev.replace(/(^|\s)@(\w*)$/, (s, sp) => `${sp}@${m.handle} `));
      setShowMentions(false);
      setMentionQuery(null);
    } catch {}
  };

  const handleSubmit = async (message: any) => {
    const hasText = Boolean(message.text);
    if (!hasText) return;
    // Clear synchronously to avoid the brief delay
    const textToSend = message.text;
    setInput('');
    setAttachedFiles([]);
    const parts = [{ type: 'text', text: textToSend }];
    const userMsg: any = { id: `u_${Date.now()}`, role: 'user', userId: myId, userInfo: me?.info, parts };
    appendToSession(userMsg);
    const mentionsAI = /(^|\s)@(ai|assistant|bot)\b/i.test(textToSend);
    if (mentionsAI) {
      analytics.track('canvas', 'node', 'chat', { model: selectedModel, webSearch: search, trigger: '@mention' });
      await sendMessage({ parts, userId: myId, userInfo: me?.info } as any, { body: { modelId: selectedModel, webSearch: search } });
    } else {
      // Human-only; nothing else to do
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="nowheel nodrag nopan flex-1 min-h-0 overflow-hidden rounded-2xl border bg-muted/20" onPointerDown={(e) => e.stopPropagation()}>
        <Conversation className="h-full">
          <ConversationContent className="px-2">
            {(displayMessages ?? []).map((message: any, msgIdx: number) => {
              // Skip rendering empty assistant placeholders (no text, no files, no sources yet)
              if (message.role === 'assistant') {
                const hasRenderable = (message.parts ?? []).some((p: any) => p.type === 'text' || (p.type === 'file' && (p.url || p.data)) || p.type === 'source-url');
                if (!hasRenderable) return null;
              }
              return (
              <div key={message.id}>
                {/* Sources above message like the example */}
                {/* Inline sources pills under the assistant reply (favicon + host) */}
                {/* We render these after the message content below */}
                {message.parts?.map((part: any, i: number) => {
                  switch (part.type) {
                     case 'text':
                       const isMe = Boolean((message as any).userId) && Boolean(myId) && ((message as any).userId === myId);
                       return (
                        <Message key={`${message.id}-${i}`} from={isMe ? 'user' : 'assistant'} avatarUrl={isMe ? myAvatar : '/Easel-Logo.svg'}>
                           {isMe ? (
                             <div className="text-white">{part.text}</div>
                           ) : (
                             <MessageContent>
                               <Response>{part.text}</Response>
                             </MessageContent>
                           )}
                         </Message>
                       );
                    case 'file':
                    if (typeof part.mediaType === 'string' && part.mediaType.startsWith('image/') && typeof part.url === 'string') {
                       return (
                         <Message key={`${message.id}-${i}`} from={((message as any).userId && myId && (message as any).userId === myId) ? 'user' : 'assistant'} avatarUrl={((message as any).userId && myId && (message as any).userId === myId) ? myAvatar : '/Easel-Logo.svg'}>
                           <div className="overflow-hidden rounded-xl border bg-card/60">
                             <img src={part.url} alt="Generated image" className="block max-h-[420px] w-auto" />
                           </div>
                         </Message>
                       );
                     }
                     return null;
                   case 'image':
                     // Provider normalized image; could be URL or binary
                     try {
                       const src = typeof part.image === 'string' ? part.image : (part.image ? URL.createObjectURL(new Blob([part.image as any])) : undefined);
                       if (!src) return null;
                       return (
                         <Message key={`${message.id}-${i}`} from={((message as any).userId && myId && (message as any).userId === myId) ? 'user' : 'assistant'} avatarUrl={((message as any).userId && myId && (message as any).userId === myId) ? myAvatar : '/Easel-Logo.svg'}>
                           <div className="overflow-hidden rounded-xl border bg-card/60">
                             <img src={src} alt="Image" className="block max-h-[420px] w-auto" />
                           </div>
                         </Message>
                       );
                     } catch {
                       return null;
                     }
                    case 'reasoning':
                      return (
                        <Reasoning key={`${message.id}-${i}`} className="w-full" isStreaming={status === 'streaming' && i === message.parts.length - 1 && message.id === (messages as any).at(-1)?.id}>
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
                    default:
                      return null;
                  }
                })}
                {message.role === 'assistant' && (() => {
                  const urls: string[] = (message.parts ?? [])
                    .filter((p: any) => p.type === 'source-url' && typeof p.url === 'string')
                    .map((p: any) => p.url)
                    .slice(0, 12);
                  if (!urls.length) return null;
                  const getHost = (u: string) => {
                    try { return new URL(u).hostname; } catch { return u; }
                  };
                  return (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {urls.map((u, i) => {
                        const host = getHost(u);
                        const icon = `https://icons.duckduckgo.com/ip3/${host}.ico`;
                        return (
                          <a
                            key={`${message.id}-pill-${i}`}
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border bg-card/60 px-2 py-1 text-xs hover:bg-accent"
                            title={u}
                          >
                            <img src={icon} alt="" className="h-3.5 w-3.5" />
                            <span className="max-w-[160px] truncate">{host}</span>
                          </a>
                        );
                      })}
                    </div>
                  );
                })()}
                {/* Hover actions under assistant reply */}
                {message.role === 'assistant' && msgIdx === (displayMessages as any).length - 1 && (
                  <div className="mt-1 max-w-[80%] opacity-0 transition-opacity hover:opacity-100">
                    <Actions>
                      <Action onClick={() => regenerate()} label="Retry">
                        <RefreshCcwIcon className="size-3" />
                      </Action>
                      <Action onClick={() => {
                        const textParts = (message.parts ?? []).filter((p: any) => p.type === 'text');
                        const toCopy = textParts.map((p: any) => p.text).join('\n');
                        navigator.clipboard?.writeText(toCopy);
                      }} label="Copy">
                        <CopyIcon className="size-3" />
                      </Action>
                    </Actions>
                  </div>
                )}
              </div>
            )})}
            {/* loader removed to avoid transient placeholder box */}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
      {/* Typing indicator above the prompt input */}
      {(() => {
        const typingPeers: any[] = Array.from(others).filter((o: any) => o?.presence?.typing);
        if (!typingPeers.length) return null;
        return (
          <div className="mt-1 mb-1 flex flex-wrap items-center gap-3 px-2 text-xs text-muted-foreground">
            {typingPeers.slice(0, 4).map((o: any) => {
              const name = (o.info as any)?.name || 'Someone';
              const avatar = (o.info as any)?.avatar as string | undefined;
              return (
                <div key={o.id} className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-2">
                    {avatar ? (
                      <img src={avatar} alt="" className="h-5 w-5 rounded-full" />
                    ) : (
                      <span className="h-5 w-5 rounded-full bg-muted inline-block" />
                    )}
                    <span className="truncate max-w-[120px]">{name}</span>
                  </span>
                  <span className="italic opacity-80">is typing…</span>
                </div>
              );
            })}
          </div>
        );
      })()}

      <PromptInput className="mt-2 rounded-2xl border bg-muted/20" onSubmit={handleSubmit}>
        <PromptInputBody className="max-h-40 overflow-y-auto" onPointerDown={(e)=>e.stopPropagation()}>
          {attachedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachedFiles.slice(0,3).map((f, i) => {
                const isImg = f.type.startsWith('image/');
                const url = URL.createObjectURL(f);
                return (
                  <div key={`attach-${i}`} className="overflow-hidden rounded-md border bg-card/60">
                    {isImg ? (
                      <img src={url} alt={f.name} className="block h-16 w-16 object-cover" />
                    ) : (
                      <div className="h-16 w-16 flex items-center justify-center text-xs px-2 text-center">{f.name}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <PromptInputTextarea className="max-h-32" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything…" />
				{showMentions && (
				  <div className="absolute bottom-12 left-3 z-20 min-w-[220px] max-w-[320px] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow">
				    <div className="max-h-56 overflow-y-auto">
				      {allMentionables.slice(0, 12).map((m) => (
				        <button key={m.id} className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={() => insertMention(m)}>
				          {m.avatar ? <img src={m.avatar} alt="" className="h-5 w-5 rounded-full" /> : <span className="h-5 w-5 rounded-full bg-muted inline-block" />}
				          <span className="truncate">{m.name}</span>
				          <span className="ml-auto text-xs text-muted-foreground">@{m.handle}</span>
				        </button>
				      ))}
				      {allMentionables.length === 0 && (
				        <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
				      )}
				    </div>
				  </div>
				)}
        </PromptInputBody>
        <PromptInputToolbar>
          <PromptInputTools>
            {/* Attach temporarily hidden */}
            <PromptInputButton
              variant={listening ? 'default' : 'ghost'}
              onClick={() => {
                try {
                  const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  if (!SR) return;
                  if (recognitionRef.current) {
                    recognitionRef.current.stop();
                    recognitionRef.current = null;
                    setListening(false);
                    return;
                  }
                  const rec = new SR();
                  rec.lang = 'en-US';
                  rec.interimResults = true;
                  rec.continuous = true;
                  micBaseInputRef.current = input;
                  micLastIndexRef.current = -1;
                  rec.onresult = (e: any) => {
                    let combined = '';
                    for (let i = 0; i < e.results.length; i++) {
                      const res = e.results[i];
                      if (i <= micLastIndexRef.current && !res.isFinal) continue;
                      combined += (res[0]?.transcript || '') + ' ';
                      if (res.isFinal) micLastIndexRef.current = i;
                    }
                    const text = `${micBaseInputRef.current}${micBaseInputRef.current ? ' ' : ''}${combined.trim()}`.trim();
                    setInput(text);
                  };
                  rec.onend = () => { setListening(false); recognitionRef.current = null; };
                  rec.onerror = () => { setListening(false); recognitionRef.current = null; };
                  recognitionRef.current = rec;
                  setListening(true);
                  rec.start();
                } catch {}
              }}
            >
              <MicIcon size={16} />
              <span>{listening ? 'Listening…' : 'Voice'}</span>
            </PromptInputButton>
            <PromptInputButton variant={search ? 'default' : 'ghost'} onClick={() => setSearch(!search)}>
              <GlobeIcon size={16} />
              <span>Search</span>
            </PromptInputButton>
            <div className="min-w-[240px]">
              <ModelSelector value={selectedModel} options={modelsMap as any} onChange={(v: string) => setSelectedModel(v)} className="w-full" />
            </div>
			{mentionsAIInInput && (
			  <div className="ml-2 hidden sm:flex items-center rounded-md border bg-card/60 px-2 py-1 text-xs text-foreground/80">
			    Will ask AI · {selectedModel}
			  </div>
			)}
          </PromptInputTools>
          <PromptInputSubmit disabled={!input && !status} status={status as any} />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
};

export const ChatPrimitive = (props: ChatNodeProps & { title: string }) => {
  const { updateNodeData } = useReactFlow();
  const { models } = useGateway();
  const sessions: ChatSession[] = (props.data.sessions ?? []);
  const activeId = props.data.activeSessionId ?? sessions[0]?.id;
  const active = sessions.find((s) => s.id === activeId);

  const chatModels = useMemo(() => {
    // Use full gateway models list, identical to the Text node
    return models;
  }, [models]);

  const defaultModel = useMemo(() => {
    const order = ['openai/gpt-5', 'openai/gpt-4o', 'anthropic/claude-3-5-sonnet-latest', 'google/gemini-1.5-pro', 'meta/llama-3.1-70b-instruct'];
    for (const id of order) {
      if (chatModels[id]) return id;
    }
    return Object.keys(chatModels)[0];
  }, [chatModels]);

  const model = props.data.model ?? defaultModel;
  const webSearch = Boolean(props.data.webSearch);

  const ensureSession = () => {
    const existing = sessions.find((s) => s.id === activeId) || sessions[0];
    if (existing) return existing.id;
    const deterministicId = `${props.id}-default`;
    const next: ChatSession = { id: deterministicId, name: 'New chat', createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
    updateNodeData(props.id, {
      sessions: [...sessions, next],
      activeSessionId: deterministicId,
    });
    return deterministicId;
  };

  const setActiveSession = (id: string) => {
    updateNodeData(props.id, { activeSessionId: id });
  };

  const renameSessionIfNeeded = (sessId: string, firstUserText: string) => {
    const trimmed = (firstUserText || '').replace(/\s+/g, ' ').slice(0, 40);
    if (!trimmed) return;
    const next = (props.data.sessions ?? []).map((s) =>
      s.id === sessId && (s.name === 'New chat' || !s.name) ? { ...s, name: trimmed } : s
    );
    updateNodeData(props.id, { sessions: next });
  };

  const deleteSession = (id: string) => {
    const next = (props.data.sessions ?? []).filter((s) => s.id !== id);
    const nextActive = (props.data.activeSessionId === id && next.length) ? next[0].id : (props.data.activeSessionId === id ? undefined : props.data.activeSessionId);
    updateNodeData(props.id, { sessions: next, activeSessionId: nextActive });
  };

  // useChat is now scoped inside ChatPanel and remounted via key on session change

  const toolbar = undefined as any;

  return (
    <NodeLayout
      {...props}
      toolbar={toolbar}
      data={{ ...props.data, width: props.data.width ?? 1400, height: props.data.height ?? 980, resizable: false, fullscreenSupported: true, allowIncoming: true, allowOutgoing: true, titleOverride: 'Chat' }}
    >
      <div className={`flex h-full min-h-0 ${((props.data as any)?.sidebarCollapsed ? 'gap-0' : 'gap-3')} p-2`}>
        {/* Sidebar */}
        <div className={`nowheel nodrag nopan shrink-0 overflow-hidden rounded-2xl border bg-card/60 p-2 transition-all duration-300 ${ (props.data as any)?.sidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-64 opacity-100' }`} onPointerDown={(e) => e.stopPropagation()}>
          {/* Sidebar header removed per request */}
          <div className="space-y-1">
            {(sessions.length ? sessions : []).map((s) => (
              <div key={s.id} className={`group flex items-center gap-1 rounded-lg border px-2 py-1 ${s.id === activeId ? 'bg-emerald-600 text-white' : 'bg-background/50 hover:bg-muted/30'}`}>
                <button className="flex-1 truncate text-left text-xs" onClick={() => setActiveSession(s.id)}>{s.name || 'Untitled'}</button>
                <Button size="icon" variant="ghost" className={`opacity-0 transition-opacity group-hover:opacity-100 ${s.id===activeId ? 'text-white' : ''}`} onClick={() => deleteSession(s.id)}>
                  <Trash2Icon className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Always-on header for the chat pane */}
          <div className="mb-2 flex items-center justify-between rounded-2xl border bg-card/60 p-2">
            <div className="flex items-center gap-2">
              <Button size="icon" className="rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => updateNodeData(props.id, { sidebarCollapsed: !(props.data as any)?.sidebarCollapsed })}>
                <span className="h-4 w-4">≡</span>
              </Button>
              <div className="truncate text-sm font-semibold text-foreground max-w-[360px]">
                {(props.data.sessions ?? []).find((s)=> s.id === activeId)?.name || 'New chat'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" className="rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => {
                const id = nanoid();
                const next: ChatSession = { id, name: 'New chat', createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
                updateNodeData(props.id, { sessions: [...(props.data.sessions ?? []), next], activeSessionId: id });
              }}>
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Controls */}
          <ChatPanel
            key={activeId || 'no-session'}
            nodeId={props.id}
            sessionId={activeId ?? ensureSession()}
            model={model}
            webSearch={webSearch}
            sessions={sessions}
            renameSessionIfNeeded={renameSessionIfNeeded}
            updateNodeData={updateNodeData}
            modelsMap={chatModels}
          />
        </div>
      </div>
    </NodeLayout>
  );
};


