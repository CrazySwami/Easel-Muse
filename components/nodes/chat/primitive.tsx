'use client';

import { useEffect, useMemo, useState } from 'react';
import { NodeLayout } from '@/components/nodes/layout';
import type { ChatNodeProps, ChatSession, UIMessage } from './index';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModelSelector } from '../model-selector';
import { useGateway } from '@/providers/gateway/client';
import { nanoid } from 'nanoid';
import { PlusIcon, Trash2Icon, GlobeIcon, RefreshCcwIcon, CopyIcon } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { useReactFlow } from '@xyflow/react';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
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
  const { messages, status, sendMessage, regenerate } = useChat();
  const [draft, setDraft] = useState('');

  // Sync to node data for this session
  useEffect(() => {
    // Auto-name by first user message
    const firstUser = messages.find((m) => m.role === 'user');
    if (firstUser) {
      const text = (firstUser.parts ?? []).map((p: any) => (p.type === 'text' ? p.text : '')).join(' ').trim();
      renameSessionIfNeeded(sessionId, text);
    }
    const nextSessions = (sessions ?? []).map((s) =>
      s.id === sessionId ? { ...s, updatedAt: Date.now(), messages: messages as unknown as UIMessage[] } : s
    );
    updateNodeData(nodeId, { sessions: nextSessions });

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
        fetch('/api/chat/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: (firstUser.parts ?? []).map((p: any)=>p.text||'').join(' '), assistant: text }),
        }).then(async (r)=>{
          const { title } = await r.json().catch(()=>({ title: 'New chat' }));
          const next = (sessions ?? []).map((s)=> s.id === sessionId ? { ...s, name: title } : s);
          updateNodeData(nodeId, { sessions: next });
        }).catch(()=>{});
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
    if (saved.length === 0) return messages as any[];
    const liveById = new Map((messages as any[]).map((m) => [m.id, m]));
    return saved.map((m) => liveById.get(m.id) ?? m);
  })();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="nowheel nodrag nopan flex-1 min-h-0 overflow-hidden rounded-2xl border bg-muted/20" onPointerDown={(e) => e.stopPropagation()}>
        <Conversation className="h-full">
          <ConversationContent>
            {(displayMessages ?? []).map((message: any, msgIdx: number) => (
              <div key={message.id}>
                {message.role === 'assistant' && message.parts?.filter((p: any) => p.type === 'source-url').length > 0 && (
                  <Sources>
                    <SourcesTrigger count={message.parts.filter((p: any) => p.type === 'source-url').length} />
                    {message.parts.filter((p: any) => p.type === 'source-url').map((part: any, i: number) => (
                      <SourcesContent key={`${message.id}-${i}`}>
                        <Source href={part.url} title={part.url} />
                      </SourcesContent>
                    ))}
                  </Sources>
                )}
                {message.parts?.map((part: any, i: number) => {
                  switch (part.type) {
                    case 'text':
                      return (
                        <Message key={`${message.id}-${i}`} from={message.role === 'user' ? 'user' : 'assistant'}>
                          <MessageContent>
                            <Response>{part.text}</Response>
                          </MessageContent>
                        </Message>
                      );
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
                {message.role === 'assistant' && msgIdx === (displayMessages as any).length - 1 && (
                  <Actions className="mt-2">
                    <Action onClick={() => regenerate?.()} label="Retry">
                      <RefreshCcwIcon className="size-3" />
                    </Action>
                    <Action
                      onClick={() => {
                        const textParts = (message.parts ?? []).filter((p: any) => p.type === 'text');
                        const toCopy = textParts.map((p: any) => p.text).join('\n');
                        navigator.clipboard?.writeText(toCopy);
                      }}
                      label="Copy"
                    >
                      <CopyIcon className="size-3" />
                    </Action>
                  </Actions>
                )}
              </div>
            ))}
            {status === 'submitted' && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <PromptInput
        className="mt-2 rounded-2xl border bg-muted/20"
        onSubmit={async (msg: any) => {
          const text = (msg?.text as string) ?? draft;
          const files = (msg as any)?.files;
          if (isSending || !(text || files?.length)) return;
          setIsSending(true);
          await sendMessage({ text: text || 'Sent with attachments', files }, { body: { model, webSearch } });
          setIsSending(false);
        }}
      >
        <PromptInputBody>
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
          <PromptInputTextarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask anything…" />
        </PromptInputBody>
        <PromptInputToolbar>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
            <PromptInputButton variant={webSearch ? 'default' : 'ghost'} onClick={() => updateNodeData(nodeId, { webSearch: !webSearch })}>
              <GlobeIcon size={16} />
              <span>Search</span>
            </PromptInputButton>
            <PromptInputModelSelect onValueChange={(value) => updateNodeData(nodeId, { model: value })} value={model}>
              <PromptInputModelSelectTrigger>
                <PromptInputModelSelectValue />
              </PromptInputModelSelectTrigger>
              <PromptInputModelSelectContent>
                {Object.keys(modelsMap).map((id) => (
                  <PromptInputModelSelectItem key={id} value={id}>
                    {(modelsMap as any)[id]?.label ?? id}
                  </PromptInputModelSelectItem>
                ))}
              </PromptInputModelSelectContent>
            </PromptInputModelSelect>
          </PromptInputTools>
          <PromptInputSubmit disabled={!draft && status !== 'streaming'} status={status as any} />
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
    return Object.fromEntries(
      Object.entries(models).filter(([_, m]: any) => {
        const provs = (m?.providers ?? []).map((p: any) => p.id);
        return provs.includes('openai') || provs.includes('anthropic') || provs.includes('google') || provs.includes('meta');
      })
    );
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
      data={{ ...props.data, width: props.data.width ?? 1120, height: props.data.height ?? 760, resizable: false, fullscreenSupported: true, allowIncoming: true, allowOutgoing: true, titleOverride: 'Chat' }}
    >
      <div className="flex h-full min-h-0 gap-3 p-3">
        {/* Sidebar */}
        <div className={`nowheel nodrag nopan shrink-0 overflow-hidden rounded-2xl border bg-card/60 p-2 transition-all duration-300 ${ (props.data as any)?.sidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-64 opacity-100' }`} onPointerDown={(e) => e.stopPropagation()}>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Chats</div>
            <div className="inline-flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => {
              const id = nanoid();
              const next: ChatSession = { id, name: 'New chat', createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
              updateNodeData(props.id, { sessions: [...(props.data.sessions ?? []), next], activeSessionId: id });
            }}>
              <PlusIcon className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => updateNodeData(props.id, { sidebarCollapsed: true })}>
              <span className="h-4 w-4">≡</span>
            </Button>
            </div>
          </div>
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
          {(props.data as any)?.sidebarCollapsed ? (
            <div className="mb-2 flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={() => updateNodeData(props.id, { sidebarCollapsed: false })}>
                <span className="h-4 w-4">≡</span>
              </Button>
              <div className="text-xs text-muted-foreground">Chats hidden</div>
            </div>
          ) : null}
          {/* Controls */}
          {/* Removed top controls per spec to avoid redundancy */}
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


