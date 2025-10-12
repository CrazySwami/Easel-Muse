'use client';

import { NodeLayout } from '@/components/nodes/layout';
import type { AICompareNodeProps } from './index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReactFlow } from '@xyflow/react';
import { useCallback, useMemo, useState, useEffect } from 'react';
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

  const [isRunning, setIsRunning] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  const runSingle = useCallback(async () => {
    const q = (queries[0] || '').trim();
    if (!q) return;
    setIsRunning(true);
    try {
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
    } finally {
      setIsRunning(false);
    }
  }, [queries, updateNodeData, props.id]);

  const runBatch = useCallback(async () => {
    const valid = queries.map((x) => x.trim()).filter(Boolean);
    if (!valid.length) return;
    const statuses = valid.map(() => 'running') as Array<'idle'|'running'|'done'|'error'>;
    updateNodeData(props.id, { batchStatuses: statuses, selectedQueryIndex: 0, results: null });
    const accum: any[] = [];
    setIsBatchRunning(true);
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
    setIsBatchRunning(false);
  }, [queries, updateNodeData, props.id]);

  // No Gemini-only mode; keep bulk mode for multiple questions

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
              <Button onClick={runSingle} disabled={isRunning}>{isRunning ? 'Running…' : 'Run'}</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button onClick={runBatch} disabled={isBatchRunning}>{isBatchRunning ? 'Running…' : 'Run Batch'}</Button>
              <Button variant="outline" size="sm" onClick={addQuery}><PlusIcon className="mr-2 h-4 w-4"/>Add</Button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
          {/* Left: sources in single mode; questions list in batch mode */}
          <div className="col-span-4 min-h-0 overflow-auto rounded-2xl border bg-card/60 p-2">
            {inputMode === 'batch' ? (
              <div className="space-y-2">
                {queries.map((q, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      className={`shrink-0 rounded border px-2 py-1 text-xs ${props.data.selectedQueryIndex===idx ? 'bg-primary/10 border-primary' : 'border-border'}`}
                      onClick={() => updateNodeData(props.id, { selectedQueryIndex: idx })}
                    >{idx+1}</button>
                    <Input value={q} onChange={(e)=>updateQuery(idx, e.target.value)} />
                    {Array.isArray(batchStatuses) && batchStatuses[idx] === 'running' && <span className="text-xs text-muted-foreground">…</span>}
                    {Array.isArray(batchStatuses) && batchStatuses[idx] === 'done' && <CheckIcon className="h-4 w-4 text-emerald-600" />}
                    <Button variant="ghost" size="icon" onClick={() => removeQuery(idx)}><XIcon className="h-4 w-4"/></Button>
                  </div>
                ))}
              </div>
            ) : (
              <SourcesPanel results={props.data.results} selectedIndex={props.data.selectedQueryIndex ?? 0} />
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
                {renderRows(props.data.results, props.data.selectedQueryIndex ?? 0)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </NodeLayout>
  );
};

function renderRows(results: any, selectedIndex: number) {
  const rows = buildCoverage(results, selectedIndex);
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

function buildCoverage(results: any, selectedIndex: number): Array<{ domain: string; openai: boolean; gemini: boolean; anthropic: boolean; serp: boolean; total: number }> {
  try {
    // Choose the active result set
    let payload: any = null;
    if (results?.single) payload = results.single;
    else if (Array.isArray(results?.groups)) {
      const idx = selectedIndex ?? 0;
      payload = results.groups[idx];
    } else if (results) payload = results;
    if (!payload) return [];

    const toDomain = (u: string) => { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return u; } };

    const scanUrlsToDomains = (obj: any): Set<string> => {
      const found = new Set<string>();
      try {
        const t = JSON.stringify(obj ?? {});
        for (const m of t.matchAll(/https?:\/\/[^\s\)"']+/g)) found.add(toDomain(m[0]));
      } catch {}
      return found;
    };

    const openaiDomains = scanUrlsToDomains(payload.openai);
    const anthropicDomains = scanUrlsToDomains(payload.anthropic);
    const serpDomains = new Set<string>();
    try {
      const organic: any[] = Array.isArray(payload.serp?.organic_results) ? payload.serp.organic_results : [];
      organic.forEach((r) => { if (r?.link) serpDomains.add(toDomain(r.link)); });
      const refs: any[] = payload.serp?.ai_overview?.references ?? [];
      refs.forEach((r) => { if (r?.link) serpDomains.add(toDomain(r.link)); });
    } catch {}

    const geminiDomains = new Set<string>();
    try {
      const chunks: any[] = payload.gemini?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      for (const c of chunks) {
        const d = (c?.web?.title || c?.web?.domain || '').toString().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'');
        if (d) geminiDomains.add(d);
      }
      const rawDomains = scanUrlsToDomains(payload.gemini);
      for (const d of rawDomains) if (d !== 'vertexaisearch.cloud.google.com') geminiDomains.add(d);
    } catch {}

    const allDomains = new Set<string>([...openaiDomains, ...geminiDomains, ...anthropicDomains, ...serpDomains]);
    const rows = Array.from(allDomains).map((d) => ({
      domain: d,
      openai: openaiDomains.has(d),
      gemini: geminiDomains.has(d),
      anthropic: anthropicDomains.has(d),
      serp: serpDomains.has(d),
      total: 0,
    })).map((r) => ({ ...r, total: [r.openai, r.gemini, r.anthropic, r.serp].filter(Boolean).length }));
    rows.sort((a, b) => b.total - a.total || a.domain.localeCompare(b.domain));
    return rows;
  } catch {
    return [];
  }
}

function SourcesPanel({ results, selectedIndex }: { results: any; selectedIndex: number }) {
  const payload = useMemo(() => getActivePayload(results, selectedIndex), [results, selectedIndex]);
  const sources = useMemo(() => extractUrlsByProvider(payload), [payload]);
  const [resolved, setResolved] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const all = [...sources.gemini];
    const redirectors = all.filter((u) => { try { return new URL(u).hostname.endsWith('vertexaisearch.cloud.google.com'); } catch { return false; } });
    if (!redirectors.length) { setResolved(new Map()); return; }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(redirectors.map(async (u) => {
        try {
          const r = await fetch(`/api/resolve?url=${encodeURIComponent(u)}`).then((r) => r.json()).catch(() => null);
          return [u, r?.finalUrl || u] as const;
        } catch {
          return [u, u] as const;
        }
      }));
      if (!cancelled) setResolved(new Map(entries));
    })();
    return () => { cancelled = true; };
  }, [sources.gemini.join('|')]);
  const renderGroup = (label: string, icon: React.ReactNode, urls: string[]) => (
    <div className="mb-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-foreground/80">
        {icon}
        <span>{label}</span>
        <span className="text-muted-foreground">({urls.length})</span>
      </div>
      <div className="space-y-1">
        {urls.slice(0, 30).map((u) => {
          const finalUrl = resolved.get(u) ?? u;
          let host = ''; try { host = new URL(finalUrl).hostname.replace(/^www\./,''); } catch {}
          const fav = host ? `https://www.google.com/s2/favicons?domain=${host}&sz=16` : '';
          return (
            <a key={u} href={finalUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate text-primary hover:underline">
              {fav ? <img src={fav} alt="" width={14} height={14} className="rounded"/> : <span className="h-3.5 w-3.5 rounded bg-muted inline-block"/>}
              <span className="truncate text-foreground/90">{host || finalUrl}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
  if (!payload) return <div className="text-xs text-muted-foreground">Run to see sources.</div>;
  return (
    <div className="text-xs h-full min-h-0 overflow-auto pr-1">
      {renderGroup('ChatGPT', <OpenAiIcon className="h-3.5 w-3.5" />, sources.openai)}
      {renderGroup('Gemini', <GeminiIcon className="h-3.5 w-3.5" />, sources.gemini)}
      {renderGroup('Claude', <AnthropicIcon className="h-3.5 w-3.5" />, sources.anthropic)}
      {renderGroup('SerpApi', <GoogleIcon className="h-3.5 w-3.5" />, sources.serp)}
    </div>
  );
}

function getActivePayload(results: any, selectedIndex: number) {
  if (!results) return null;
  if (results.single) return results.single;
  if (Array.isArray(results.groups)) return results.groups[selectedIndex ?? 0];
  return results;
}

function extractUrlsByProvider(payload: any): { openai: string[]; gemini: string[]; anthropic: string[]; serp: string[] } {
  const out = { openai: [] as string[], gemini: [] as string[], anthropic: [] as string[], serp: [] as string[] };
  if (!payload) return out;
  const push = (arr: string[], u?: string) => { try { if (u) arr.push(new URL(u).href); } catch {} };
  try {
    const t = JSON.stringify(payload.openai ?? {});
    for (const m of t.matchAll(/https?:\/\/[^\s\)"']+/g)) push(out.openai, m[0]);
  } catch {}
  try {
    const chunks: any[] = payload.gemini?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    for (const c of chunks) push(out.gemini, c?.web?.uri);
    const t = JSON.stringify(payload.gemini ?? {});
    for (const m of t.matchAll(/https?:\/\/[^\s\)"']+/g)) push(out.gemini, m[0]);
  } catch {}
  try {
    const t = JSON.stringify(payload.anthropic ?? {});
    for (const m of t.matchAll(/https?:\/\/[^\s\)"']+/g)) push(out.anthropic, m[0]);
  } catch {}
  try {
    const organic: any[] = Array.isArray(payload.serp?.organic_results) ? payload.serp.organic_results : [];
    organic.forEach((r) => push(out.serp, r?.link));
    const refs: any[] = payload.serp?.ai_overview?.references ?? [];
    refs.forEach((r) => push(out.serp, r?.link));
  } catch {}
  return {
    openai: Array.from(new Set(out.openai)),
    gemini: Array.from(new Set(out.gemini)),
    anthropic: Array.from(new Set(out.anthropic)),
    serp: Array.from(new Set(out.serp)),
  };
}


