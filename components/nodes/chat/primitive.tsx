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
import { useSelf } from '@liveblocks/react';
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
  const { messages, status, sendMessage, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const me = useSelf();
  const [input, setInput] = useState('');
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

  // Sync to node data for this session; avoid overwriting saved history with empty while switching
  useEffect(() => {
    // Auto-name by first user message
    const firstUser = messages.find((m) => m.role === 'user');
    if (firstUser) {
      const text = (firstUser.parts ?? []).map((p: any) => (p.type === 'text' ? p.text : '')).join(' ').trim();
      renameSessionIfNeeded(sessionId, text);
    }
    if ((messages ?? []).length > 0) {
      const currentSaved = (sessions ?? []).find((s) => s.id === sessionId)?.messages?.length ?? 0;
      const incoming = (messages as any[])?.length ?? 0;
      // Prevent overwriting history with fewer/empty messages
      if (incoming >= currentSaved) {
        const nextSessions = (sessions ?? []).map((s) =>
          s.id === sessionId ? { ...s, updatedAt: Date.now(), messages: messages as unknown as UIMessage[] } : s
        );
        updateNodeData(nodeId, { sessions: nextSessions });
      }
    }

    // Push latest assistant text
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant) {
      const text = (lastAssistant.parts ?? []).map((p: any) => (p.type === 'text' ? p.text : '')).join(' ').trim();
      if (text) updateNodeData(nodeId, { outputTexts: [text] });
      // Auto-title after first exchange
      const sess = (sessions ?? []).find((s) => s.id === sessionId);
      const isDefault = sess && (sess.name === 'New chat' || !sess.name);
      const firstUser = messages.find((m) => m.role === 'user');
    if (isDefault && firstUser) {
      const abort = new AbortController();
      fetch('/api/chat/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: (firstUser.parts ?? []).map((p: any)=>p.text||'').join(' '), assistant: text }),
        signal: abort.signal,
      }).then(async (r)=>{
          const { title } = await r.json().catch(()=>({ title: 'New chat' }));
          const next = (sessions ?? []).map((s)=> s.id === sessionId ? { ...s, name: title } : s);
          updateNodeData(nodeId, { sessions: next });
        }).catch(()=>{});
      return () => abort.abort();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, sessionId]);

  const [isSending, setIsSending] = useState(false);

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
    return merged;
  })();

  // Guard against accidental overwrites of history with fewer/empty messages
  const lastSavedCountRef = useRef<number>(session?.messages?.length ?? 0);
  useEffect(() => {
    const current = (messages ?? []).length;
    if (current === 0) return; // never overwrite with empty
    if ((session?.messages?.length ?? 0) > current) return; // don't replace with fewer
    lastSavedCountRef.current = current;
  }, [messages, session?.messages?.length]);

  // no-op helper removed; rely on DefaultChatTransport to build multipart for File[]

  const handleSubmit = async (message: any) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean((message.files?.length ?? 0) || attachedFiles.length);
    if (!(hasText || hasAttachments)) return;
    const filesToSend: Array<File> = (message.files && message.files.length ? Array.from(message.files as FileList) : attachedFiles).slice(0, 3);
    const dt = new DataTransfer();
    filesToSend.forEach((f) => dt.items.add(f));
    await sendMessage({ text: message.text, files: dt.files }, { body: { modelId: selectedModel, webSearch: search } });
    setInput('');
    setAttachedFiles([]);
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
                       return (
                        <Message key={`${message.id}-${i}`} from={message.role === 'user' ? 'user' : 'assistant'} avatarUrl={message.role === 'user' ? ((me?.info as any)?.avatar as string | undefined) : '/Easel-Logo.svg'}>
                           {message.role === 'user' ? (
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
                         <Message key={`${message.id}-${i}`} from={message.role === 'user' ? 'user' : 'assistant'} avatarUrl={message.role === 'user' ? ((me?.info as any)?.avatar as string | undefined) : '/Easel-Logo.svg'}>
                           <div className="overflow-hidden rounded-xl border bg-card/60">
                             <img src={part.url} alt="Generated image" className="block max-h-[420px] w-auto" />
                           </div>
                         </Message>
                       );
                     }
                     return null;
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
                {/* copy action removed per design */}
              </div>
            )})}
            {/* loader removed to avoid transient placeholder box */}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

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
        </PromptInputBody>
        <PromptInputToolbar>
          <PromptInputTools>
            {(() => {
              const id = (selectedModel || '').toLowerCase();
              const imageCapable = /gpt-4o|gpt-4\.1|gpt-5|gemini-1\.5|flash|haiku|sonnet|vision|llama/.test(id);
              const fileCapable = /gpt-4o|gpt-4\.1|gpt-5|gemini-1\.5|claude-3/.test(id);
              const accept = [imageCapable ? 'image/*' : null, fileCapable ? 'application/pdf,text/plain' : null]
                .filter(Boolean)
                .join(',');
              return (
                <>
                  <input
                    type="file"
                    multiple
                    accept={accept || undefined}
                    className="hidden"
                    onChange={(e) => setAttachedFiles(Array.from(e.target.files ?? []))}
                    id={`file-input-${nodeId}`}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <PromptInputButton
                          onClick={() => {
                            const el = document.getElementById(`file-input-${nodeId}`) as HTMLInputElement | null;
                            el?.click();
                          }}
                          disabled={!accept}
                        >
                          <PaperclipIcon size={16} />
                          <span>{attachedFiles.length ? `${attachedFiles.length} file${attachedFiles.length>1?'s':''}` : 'Attach'}</span>
                        </PromptInputButton>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span>Accepted: {accept || 'None'}</span>
                    </TooltipContent>
                  </Tooltip>
                </>
              );
            })()}
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
    if (active) return active.id;
    const id = nanoid();
    const next: ChatSession = { id, name: 'New chat', createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
    updateNodeData(props.id, {
      sessions: [...sessions, next],
      activeSessionId: id,
    });
    return id;
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
              <div key={s.id} className={`group flex items-center gap-1 rounded-lg border px-2 py-1 ${s.id === activeId ? 'bg-muted/60' : 'bg-background/50 hover:bg-muted/30'}`}>
                <button className="flex-1 truncate text-left text-xs" onClick={() => setActiveSession(s.id)}>{s.name || 'Untitled'}</button>
                <Button size="icon" variant="ghost" className="opacity-0 transition-opacity group-hover:opacity-100" onClick={() => deleteSession(s.id)}>
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
              <Button size="icon" variant="ghost" onClick={() => updateNodeData(props.id, { sidebarCollapsed: !(props.data as any)?.sidebarCollapsed })}>
                <span className="h-4 w-4">≡</span>
              </Button>
              <div className="truncate text-sm font-semibold text-foreground max-w-[360px]">
                {(props.data.sessions ?? []).find((s)=> s.id === activeId)?.name || 'New chat'}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => {
              const id = nanoid();
              const next: ChatSession = { id, name: 'New chat', createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
              updateNodeData(props.id, { sessions: [...(props.data.sessions ?? []), next], activeSessionId: id });
            }}>
              <PlusIcon className="h-4 w-4" />
            </Button>
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


