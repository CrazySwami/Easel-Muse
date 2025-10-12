'use client';

import { useEffect, useMemo, useState } from 'react';
import { NodeLayout } from '@/components/nodes/layout';
import type { ChatNodeProps, ChatSession, UIMessage } from './index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ModelSelector } from '../model-selector';
import { useGateway } from '@/providers/gateway/client';
import { nanoid } from 'nanoid';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { useReactFlow } from '@xyflow/react';

export const ChatPrimitive = (props: ChatNodeProps & { title: string }) => {
  const { updateNodeData } = useReactFlow();
  const { models } = useGateway();
  const sessions: ChatSession[] = (props.data.sessions ?? []);
  const activeId = props.data.activeSessionId ?? sessions[0]?.id;
  const active = sessions.find((s) => s.id === activeId);
  const [draft, setDraft] = useState('');

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

  const { messages, status, sendMessage } = useChat();

  // Sync useChat messages into the active session in node data
  useEffect(() => {
    const sessId = activeId ?? ensureSession();
    // Auto-name session from first user message
    const firstUser = messages.find((m) => m.role === 'user');
    if (firstUser) {
      const text = (firstUser.parts ?? []).map((p: any) => (p.type === 'text' ? p.text : '')).join(' ').trim();
      renameSessionIfNeeded(sessId, text);
    }
    const nextSessions = (props.data.sessions ?? []).map((s) =>
      s.id === sessId ? { ...s, updatedAt: Date.now(), messages: messages as unknown as UIMessage[] } : s
    );
    updateNodeData(props.id, { sessions: nextSessions });

    // Push latest assistant text to outputTexts for downstream nodes
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant) {
      const text = (lastAssistant.parts ?? []).map((p: any) => (p.type === 'text' ? p.text : '')).join(' ').trim();
      if (text) updateNodeData(props.id, { outputTexts: [text] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

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
            <Button size="icon" variant="ghost" onClick={() => { /* TODO: wire create */ }}>
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {(sessions.length ? sessions : []).map((s) => (
              <button key={s.id} className={`w-full truncate rounded-lg border px-2 py-1 text-left text-xs hover:bg-muted/50 ${s.id === activeId ? 'bg-muted/50' : ''}`}>{s.name || 'Untitled'}</button>
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

          {/* Conversation */}
          <div className="nowheel nodrag nopan flex-1 min-h-0 overflow-auto rounded-2xl border bg-card/60 p-3" onPointerDown={(e) => e.stopPropagation()}>
            <div className="space-y-3 text-sm">
              {(messages ?? []).map((m: any, i: number) => (
                <div key={i} className="rounded-lg border bg-background p-2">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{m.role}</div>
                  <div className="whitespace-pre-wrap">{m.parts?.map((p: any) => (p.type === 'text' ? p.text : '')).join(' ')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div className="mt-2 shrink-0 rounded-2xl border bg-card/60 p-2">
            <div className="flex items-center gap-2">
              <Textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} className="flex-1" placeholder="Ask anything…" />
              <Button
                disabled={!draft.trim() || status === 'streaming'}
                onClick={async () => {
                  const sessId = ensureSession();
                  // ensure active session set
                  setActiveSession(sessId);
                  await sendMessage(
                    { text: draft },
                    { body: { model, webSearch } }
                  );
                  setDraft('');
                }}
              >
                {status === 'streaming' ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </NodeLayout>
  );
};


