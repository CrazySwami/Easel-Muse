'use client';

import { NodeLayout } from '@/components/nodes/layout';
import type { AICompareNodeProps } from './index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import { OpenAiIcon, GeminiIcon, AnthropicIcon, GoogleIcon } from '@/lib/icons';
import { CheckIcon, PlusIcon, XIcon } from 'lucide-react';

type Props = AICompareNodeProps & { title: string };

export const AIComparePrimitive = (props: Props) => {
  const { updateNodeData } = useReactFlow();

  const inputMode = props.data.inputMode ?? 'single';
  const queries = props.data.queries ?? [''];
  const batchStatuses = (props.data.batchStatuses ?? []) as Array<'idle'|'running'|'done'|'error'>;

  const setInputMode = (value: 'single'|'batch') => updateNodeData(props.id, { inputMode: value });
  const updateQuery = (i: number, v: string) => {
    const next = [...queries];
    next[i] = v;
    updateNodeData(props.id, { queries: next });
  };
  const addQuery = () => updateNodeData(props.id, { queries: [...queries, ''] });
  const removeQuery = (i: number) => updateNodeData(props.id, { queries: queries.filter((_, idx) => idx !== i) });

  const runSingle = useCallback(async () => {
    const q = (queries[0] || '').trim();
    if (!q) return;
    const [o, g, a, s] = await Promise.allSettled([
      fetch('/api/openai/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q }) }).then(r=>r.json()),
      fetch('/api/gemini/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q }) }).then(r=>r.json()),
      fetch('/api/anthropic/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q }) }).then(r=>r.json()),
      fetch('/api/serpapi/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, hl: 'en', gl: 'US' }) }).then(r=>r.json()),
    ]);
    updateNodeData(props.id, {
      results: {
        single: {
          openai: o.status==='fulfilled'?o.value:null,
          gemini: g.status==='fulfilled'?g.value:null,
          anthropic: a.status==='fulfilled'?a.value:null,
          serp: s.status==='fulfilled'?s.value:null,
        },
      },
    });
  }, [queries, updateNodeData, props.id]);

  const runBatch = useCallback(async () => {
    const valid = queries.map((x) => x.trim()).filter(Boolean);
    if (!valid.length) return;
    const statuses = valid.map(() => 'running') as Array<'idle'|'running'|'done'|'error'>;
    updateNodeData(props.id, { batchStatuses: statuses, selectedQueryIndex: 0, results: null });
    const accum: any[] = [];
    for (let i = 0; i < valid.length; i++) {
      const q = valid[i];
      try {
        const [o, g, a, s] = await Promise.allSettled([
          fetch('/api/openai/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q }) }).then(r=>r.json()),
          fetch('/api/gemini/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q }) }).then(r=>r.json()),
          fetch('/api/anthropic/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q }) }).then(r=>r.json()),
          fetch('/api/serpapi/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, hl: 'en', gl: 'US' }) }).then(r=>r.json()),
        ]);
        accum[i] = {
          query: q,
          openai: o.status==='fulfilled'?o.value:null,
          gemini: g.status==='fulfilled'?g.value:null,
          anthropic: a.status==='fulfilled'?a.value:null,
          serp: s.status==='fulfilled'?s.value:null,
        };
        const next = [...statuses]; next[i] = 'done';
        updateNodeData(props.id, { batchStatuses: next, selectedQueryIndex: i, results: { groups: accum } });
      } catch {
        const next = [...statuses]; next[i] = 'error';
        updateNodeData(props.id, { batchStatuses: next, selectedQueryIndex: i });
      }
    }
  }, [queries, updateNodeData, props.id]);

  const toolbar = [
    {
      children: (
        <div className="inline-flex rounded-md border p-0.5">
          <Button variant={inputMode === 'single' ? 'default' : 'ghost'} size="sm" onClick={() => setInputMode('single')}>Single</Button>
          <Button variant={inputMode === 'batch' ? 'default' : 'ghost'} size="sm" onClick={() => setInputMode('batch')}>Batch</Button>
        </div>
      ),
    },
  ] as any;

  const width = (props.data.width ?? 1200);
  const height = (props.data.height ?? 800);

  return (
    <NodeLayout
      {...props}
      data={{ ...props.data, width, height, resizable: false, fullscreenSupported: true }}
      title={props.title}
      toolbar={toolbar}
    >
      <div className="flex h-full flex-col gap-3 p-3">
        {/* Controls */}
        <div className="shrink-0 flex items-center justify-between gap-2 rounded-2xl border bg-card/60 p-3">
          {inputMode === 'single' ? (
            <div className="flex w-full items-center gap-2">
              <Input className="w-full" value={queries[0]} onChange={(e) => updateQuery(0, e.target.value)} placeholder="Enter your query…" />
              <Button onClick={runSingle}>Run</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button onClick={runBatch}>Run Batch</Button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
          {/* Left: results list */}
          <div className="col-span-4 min-h-0 overflow-auto rounded-2xl border bg-card/60 p-2">
            {inputMode === 'batch' ? (
              <div className="space-y-2">
                {queries.map((q, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input value={q} onChange={(e)=>updateQuery(idx, e.target.value)} />
                    {Array.isArray(batchStatuses) && batchStatuses[idx] === 'running' && <span className="text-xs text-muted-foreground">…</span>}
                    {Array.isArray(batchStatuses) && batchStatuses[idx] === 'done' && <CheckIcon className="h-4 w-4 text-emerald-600" />}
                    <Button variant="ghost" size="icon" onClick={() => removeQuery(idx)}><XIcon className="h-4 w-4"/></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addQuery}><PlusIcon className="mr-2 h-4 w-4"/>Add</Button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Run a query to populate results.</div>
            )}
          </div>

          {/* Right: table */}
          <div className="col-span-8 min-h-0 overflow-auto rounded-2xl border bg-card/60 p-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b p-2">Domain</th>
                  <th className="border-b p-2"><span className="inline-flex items-center gap-1"><OpenAiIcon className="h-4 w-4"/> ChatGPT</span></th>
                  <th className="border-b p-2"><span className="inline-flex items-center gap-1"><GeminiIcon className="h-4 w-4"/> Gemini</span></th>
                  <th className="border-b p-2"><span className="inline-flex items-center gap-1"><AnthropicIcon className="h-4 w-4"/> Claude</span></th>
                  <th className="border-b p-2"><span className="inline-flex items-center gap-1"><GoogleIcon className="h-4 w-4"/> SerpApi</span></th>
                  <th className="border-b p-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {renderRows(props.data.results)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </NodeLayout>
  );
};

function renderRows(results: any) {
  const rows = buildCoverage(results);
  if (!rows.length) {
    return (
      <tr>
        <td className="border-b p-2">—</td>
        <td className="border-b p-2"></td>
        <td className="border-b p-2"></td>
        <td className="border-b p-2"></td>
        <td className="border-b p-2"></td>
        <td className="border-b p-2">0</td>
      </tr>
    );
  }
  return rows.map((r) => (
    <tr key={r.domain}>
      <td className="border-b p-2">{r.domain}</td>
      <td className="border-b p-2">{r.openai ? '✓' : ''}</td>
      <td className="border-b p-2">{r.gemini ? '✓' : ''}</td>
      <td className="border-b p-2">{r.anthropic ? '✓' : ''}</td>
      <td className="border-b p-2">{r.serp ? '✓' : ''}</td>
      <td className="border-b p-2">{r.total}</td>
    </tr>
  ));
}

function buildCoverage(results: any): Array<{ domain: string; openai: boolean; gemini: boolean; anthropic: boolean; serp: boolean; total: number }> {
  try {
    // Choose the active result set
    let payload: any = null;
    if (results?.single) payload = results.single;
    else if (Array.isArray(results?.groups)) {
      const idx = results.selectedIndex ?? 0;
      payload = results.groups[idx];
    } else if (results) payload = results;
    if (!payload) return [];

    const addUrls = (holder: Set<string>, text: string | undefined) => {
      if (!text) return;
      const regex = /https?:\/\/[^\s\)"']+/g;
      for (const m of text.matchAll(regex)) holder.add(m[0]);
    };

    const urls = new Set<string>();
    try { addUrls(urls, JSON.stringify(payload.openai ?? {})); } catch {}
    try { addUrls(urls, JSON.stringify(payload.gemini ?? {})); } catch {}
    try { addUrls(urls, JSON.stringify(payload.anthropic ?? {})); } catch {}
    try {
      const text = JSON.stringify(payload.serp ?? {});
      addUrls(urls, text);
    } catch {}

    const tOpenAI = JSON.stringify(payload.openai ?? {});
    const tGemini = JSON.stringify(payload.gemini ?? {});
    const tAnthropic = JSON.stringify(payload.anthropic ?? {});
    const tSerp = JSON.stringify(payload.serp ?? {});

    const toDomain = (u: string) => { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return u; } };
    const map = new Map<string, { domain: string; openai: boolean; gemini: boolean; anthropic: boolean; serp: boolean; total: number }>();
    for (const u of urls) {
      const d = toDomain(u);
      const openai = tOpenAI.includes(u);
      const gemini = tGemini.includes(u);
      const anthropic = tAnthropic.includes(u);
      const serp = tSerp.includes(u);
      const ex = map.get(d);
      if (ex) {
        ex.openai = ex.openai || openai; ex.gemini = ex.gemini || gemini; ex.anthropic = ex.anthropic || anthropic; ex.serp = ex.serp || serp;
      } else {
        map.set(d, { domain: d, openai, gemini, anthropic, serp, total: 0 });
      }
    }
    const rows = Array.from(map.values()).map((r) => ({ ...r, total: [r.openai, r.gemini, r.anthropic, r.serp].filter(Boolean).length }));
    rows.sort((a, b) => b.total - a.total || a.domain.localeCompare(b.domain));
    return rows;
  } catch {
    return [];
  }
}


