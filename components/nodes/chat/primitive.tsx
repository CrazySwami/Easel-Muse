'use client';

import { useEffect, useMemo, useState } from 'react';
import { NodeLayout } from '@/components/nodes/layout';
import type { ChatNodeProps, ChatSession, UIMessage } from './index';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModelSelector } from '../model-selector';
import { useGateway } from '@/providers/gateway/client';
import { nanoid } from 'nanoid';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { useReactFlow } from '@xyflow/react';
import {
  AIConversation,
  AIConversationContent,
  AIConversationScrollButton,
} from '@/components/ui/kibo-ui/ai/conversation';
import {
  AIMessage,
  AIMessageContent,
} from '@/components/ui/kibo-ui/ai/message';
import {
  AIInput,
  AIInputTextarea,
  AIInputToolbar,
  AIInputTools,
  AIInputButton,
  AIInputSubmit,
  AIInputModelSelect,
  AIInputModelSelectContent,
  AIInputModelSelectItem,
  AIInputModelSelectTrigger,
  AIInputModelSelectValue,
} from '@/components/ui/kibo-ui/ai/input';

type ChatPanelProps = {
  nodeId: string;
  sessionId: string;
  model: string;
  webSearch: boolean;
  sessions: ChatSession[];
  renameSessionIfNeeded: (sessId: string, firstUserText: string) => void;
  updateNodeData: ReturnType<typeof useReactFlow>['updateNodeData'];
};

const ChatPanel = ({ nodeId, sessionId, model, webSearch, sessions, renameSessionIfNeeded, updateNodeData }: ChatPanelProps) => {
  const { messages, status, sendMessage } = useChat();
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, sessionId]);

  const [isSending, setIsSending] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="nowheel nodrag nopan flex-1 min-h-0 overflow-hidden rounded-2xl border bg-card/60" onPointerDown={(e) => e.stopPropagation()}>
        <AIConversation className="h-full">
          <AIConversationContent>
            {(messages ?? []).map((m: any, i: number) => (
              <AIMessage key={i} from={m.role === 'user' ? 'user' : 'assistant'}>
                <AIMessageContent>
                  <div className="whitespace-pre-wrap">{m.parts?.map((p: any) => (p.type === 'text' ? p.text : '')).join(' ')}</div>
                </AIMessageContent>
              </AIMessage>
            ))}
          </AIConversationContent>
          <AIConversationScrollButton />
        </AIConversation>
      </div>

      <AIInput
        className="mt-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (isSending || !draft.trim()) return;
          setIsSending(true);
          await sendMessage({ text: draft }, { body: { model, webSearch } });
          setDraft('');
          setIsSending(false);
        }}
      >
        <AIInputTextarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask anything…"
        />
        <AIInputToolbar>
          <AIInputTools>
            {/* Web Search toggle (visual only; state wired on send) */}
            <AIInputButton variant={webSearch ? 'default' : 'ghost'} onClick={() => updateNodeData(nodeId, { webSearch: !webSearch })}>
              Search
            </AIInputButton>
            {/* Model select */}
            {/* Kept primary selector in header; optional quick-select could go here */}
          </AIInputTools>
          <AIInputSubmit status={status as any} disabled={!draft.trim() || isSending}>
            Send
          </AIInputSubmit>
        </AIInputToolbar>
      </AIInput>
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

  // useChat is now scoped inside ChatPanel and remounted via key on session change

  const toolbar = [
    {
      children: (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Chat</span>
        </div>
      ),
    },
  ] as any;

  return (
    <NodeLayout
      {...props}
      toolbar={toolbar}
      data={{ ...props.data, width: props.data.width ?? 1120, height: props.data.height ?? 760, resizable: false, fullscreenSupported: true, allowIncoming: true, allowOutgoing: true, titleOverride: 'Chat' }}
    >
      <div className="flex h-full min-h-0 gap-3 p-3">
        {/* Sidebar */}
        <div className="nowheel nodrag nopan w-64 shrink-0 overflow-auto rounded-2xl border bg-card/60 p-2" onPointerDown={(e) => e.stopPropagation()}>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Chats</div>
            <Button size="icon" variant="ghost" onClick={() => {
              const id = nanoid();
              const next: ChatSession = { id, name: 'New chat', createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
              updateNodeData(props.id, { sessions: [...(props.data.sessions ?? []), next], activeSessionId: id });
            }}>
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {(sessions.length ? sessions : []).map((s) => (
              <button
                key={s.id}
                className={`w-full truncate rounded-lg border px-2 py-1 text-left text-xs hover:bg-muted/50 ${s.id === activeId ? 'bg-muted/50' : ''}`}
                onClick={() => setActiveSession(s.id)}
              >
                {s.name || 'Untitled'}
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Controls */}
          <div className="shrink-0 rounded-2xl border bg-card/60 p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2">
                <ModelSelector value={model} options={chatModels} className="w-[240px] rounded-full" onChange={(v) => updateNodeData(props.id, { model: v })} />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={webSearch} onChange={(e) => updateNodeData(props.id, { webSearch: e.target.checked })} />
                  Web Search
                </label>
              </div>
              <div className="inline-flex items-center gap-1">
                <Button size="icon" variant="ghost"><Trash2Icon className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
          <ChatPanel
            key={activeId || 'no-session'}
            nodeId={props.id}
            sessionId={activeId ?? ensureSession()}
            model={model}
            webSearch={webSearch}
            sessions={sessions}
            renameSessionIfNeeded={renameSessionIfNeeded}
            updateNodeData={updateNodeData}
          />
        </div>
      </div>
    </NodeLayout>
  );
};


