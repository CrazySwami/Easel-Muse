'use client';

import { NodeLayout } from '@/components/nodes/layout';
import type { AICompareNodeProps } from './index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GeneratorBar } from '@/components/ui/batch/generator-bar';
import { QueryList } from '@/components/ui/batch/query-list';
import { useReactFlow } from '@xyflow/react';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { OpenAiIcon, GeminiIcon, AnthropicIcon, GoogleIcon } from '@/lib/icons';
import { CheckIcon, PlusIcon, XIcon } from 'lucide-react';
import { useGateway } from '@/providers/gateway/client';
import { ModelSelector } from '../model-selector';

const DEFAULT_TEXT_MODEL_ID = 'gpt-5-mini';
const getDefaultModel = (all: Record<string, any>) => {
  if (all[DEFAULT_TEXT_MODEL_ID]) return DEFAULT_TEXT_MODEL_ID;
  return Object.keys(all)[0];
};
// Restrict generator models similar to Text node (prefer OpenAI text-capable ones)
const OPENAI_WHITELIST_IDS = new Set([
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o-mini',
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
]);
const OPENAI_WHITELIST_LABELS = [
  'gpt-4.1',
  'gpt-4.1 mini',
  'gpt-4.1 nano',
  'gpt-4o mini',
  'gpt-5',
  'gpt-5 mini',
  'gpt-5 nano',
];
const filterTextModels = (models: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(models).filter(([id, m]: any) => {
      const isOpenAI = m?.chef?.id === 'openai' || (Array.isArray(m?.providers) && m.providers.some((p: any) => p.id === 'openai'));
      if (!isOpenAI) return false;
      const label = String(m?.label ?? '').toLowerCase();
      return OPENAI_WHITELIST_IDS.has(id) || OPENAI_WHITELIST_LABELS.some((s) => label.includes(s));
    })
  );

type Props = AICompareNodeProps & { title: string };

export const AIComparePrimitive = (props: Props) => {
  const { updateNodeData } = useReactFlow();
  const { models } = useGateway();

  const inputMode = props.data.inputMode ?? 'single';
  const queries = props.data.queries ?? [''];
  const batchStatuses = (props.data.batchStatuses ?? []) as Array<'idle'|'running'|'done'|'error'>;
  const generatePrompt = (props.data as any)?.generatePrompt ?? '';
  const model = (props.data as any)?.model ?? getDefaultModel(models);

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
  const [isGenerating, setIsGenerating] = useState(false);

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

  const isGenerateDisabled = isGenerating || !generatePrompt.trim();

  const handleGenerate = useCallback(async () => {
    if (!generatePrompt.trim()) return;
    setIsGenerating(true);
    try {
      const resp = await fetch('/api/perplexity/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'generate_questions', prompt: generatePrompt, model }),
      });
      const data = await resp.json();
      if (Array.isArray(data?.questions) && data.questions.length) {
        updateNodeData(props.id, { queries: data.questions, inputMode: 'batch' });
      }
    } catch (e) {
      // no-op
    } finally {
      setIsGenerating(false);
    }
  }, [generatePrompt, model, updateNodeData, props.id]);

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
            <div className="flex w-full items-center gap-2">
              <ModelSelector
                value={model}
                options={filterTextModels(models)}
                className="w-[220px] rounded-full"
                onChange={(v) => updateNodeData(props.id, { model: v })}
              />
              <Input
                className="flex-1"
                placeholder="Describe questions to generate…"
                value={generatePrompt}
                onChange={(e) => updateNodeData(props.id, { generatePrompt: e.target.value })}
              />
              <Button onClick={handleGenerate} disabled={isGenerateDisabled}>{isGenerating ? 'Generating…' : 'Generate to Batch'}</Button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
          {/* Left: sources in single mode; generator + questions list in batch mode */}
          <div
            className="col-span-4 min-h-0 overflow-auto rounded-2xl border bg-card/60 p-2 nowheel nodrag nopan"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {inputMode === 'batch' ? (
              <div className="flex h-full min-h-0 flex-col gap-2">
                <div className="min-h-0 flex-1 overflow-auto nowheel nodrag nopan" onPointerDown={(e)=>e.stopPropagation()}>
                  <QueryList
                    queries={queries}
                    onChange={(next) => updateNodeData(props.id, { queries: next })}
                    selectedIndex={props.data.selectedQueryIndex ?? 0}
                    onSelect={(i) => updateNodeData(props.id, { selectedQueryIndex: i })}
                    onAdd={addQuery}
                    onRun={runBatch}
                  />
                </div>
              </div>
            ) : (
              <SourcesPanel results={props.data.results} selectedIndex={props.data.selectedQueryIndex ?? 0} />
            )}
          </div>

          {/* Right: provider answers + table */}
          <div className="col-span-8 min-h-0 overflow-auto rounded-2xl border bg-card/60 p-2">
            {(() => {
              const payload = getActivePayload(props.data.results, props.data.selectedQueryIndex ?? 0);
              return <AnswersCollapsible payload={payload} />;
            })()}
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
              <span className="truncate text-foreground/90">{finalUrl}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
  if (!payload) return <div className="text-xs text-muted-foreground">Run to see sources.</div>;

  const answers = extractAnswersByProvider(payload);
  const preview = (t?: string) => (t ? (t.length > 120 ? t.slice(0, 120) + '…' : t) : '');
  return (
    <div
      className="text-xs h-full min-h-0 overflow-auto pr-1 nowheel nodrag nopan"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Collapsible answers with per-provider sources */}
      {answers.openai && (
        <div className="mb-3 rounded border bg-card/60 p-2">
          <details>
            <summary className="cursor-pointer list-none">
              <span className="inline-flex items-center gap-2 font-semibold"><OpenAiIcon className="h-3.5 w-3.5"/> ChatGPT</span>
              <span className="ml-2 text-muted-foreground">{preview(answers.openai)}</span>
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-foreground/90">{answers.openai}</p>
            <div className="mt-2">{renderGroup('Sources', <OpenAiIcon className="h-3.5 w-3.5" />, sources.openai)}</div>
          </details>
        </div>
      )}
      {answers.gemini && (
        <div className="mb-3 rounded border bg-card/60 p-2">
          <details>
            <summary className="cursor-pointer list-none">
              <span className="inline-flex items-center gap-2 font-semibold"><GeminiIcon className="h-3.5 w-3.5"/> Gemini</span>
              <span className="ml-2 text-muted-foreground">{preview(answers.gemini)}</span>
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-foreground/90">{answers.gemini}</p>
            <div className="mt-2">{renderGroup('Sources', <GeminiIcon className="h-3.5 w-3.5" />, sources.gemini)}</div>
          </details>
        </div>
      )}
      {answers.anthropic && (
        <div className="mb-3 rounded border bg-card/60 p-2">
          <details>
            <summary className="cursor-pointer list-none">
              <span className="inline-flex items-center gap-2 font-semibold"><AnthropicIcon className="h-3.5 w-3.5"/> Claude</span>
              <span className="ml-2 text-muted-foreground">{preview(answers.anthropic)}</span>
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-foreground/90">{answers.anthropic}</p>
            <div className="mt-2">{renderGroup('Sources', <AnthropicIcon className="h-3.5 w-3.5" />, sources.anthropic)}</div>
          </details>
        </div>
      )}
      {/* SerpApi static info (single mode as well) */}
      <div className="mb-3 rounded border bg-card/60 p-2">
        <details>
          <summary className="cursor-pointer list-none">
            <span className="inline-flex items-center gap-2 font-semibold"><GoogleIcon className="h-3.5 w-3.5"/> SerpApi</span>
            <span className="ml-2 text-muted-foreground">Google results preview</span>
          </summary>
          <p className="mt-2 text-foreground/90">These links are extracted from Google results via SerpApi.</p>
          {renderGroup('Sources', <GoogleIcon className="h-3.5 w-3.5" />, sources.serp)}
        </details>
      </div>
      {!answers.openai && !answers.gemini && !answers.anthropic && sources.serp.length === 0 && (
        <div className="text-muted-foreground">Run to see provider answers.</div>
      )}
    </div>
  );
}

function AnswersCollapsible({ payload }: { payload: any }) {
  const sources = extractUrlsByProvider(payload);
  const answers = extractAnswersByProvider(payload);
  const preview = (t?: string) => (t ? (t.length > 120 ? t.slice(0, 120) + '…' : t) : '');
  const renderGroup = (icon: React.ReactNode, urls: string[]) => (
    <div className="mt-2 space-y-1">
      {urls.slice(0, 30).map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer" className="block truncate text-primary hover:underline">{u}</a>
      ))}
    </div>
  );
  return (
    <div className="mb-3 space-y-2">
      {answers.openai && (
        <div className="rounded border bg-card/60 p-2">
          <details>
            <summary className="cursor-pointer list-none">
              <span className="inline-flex items-center gap-2 font-semibold"><OpenAiIcon className="h-3.5 w-3.5"/> ChatGPT</span>
              <span className="ml-2 text-muted-foreground">{preview(answers.openai)}</span>
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-foreground/90">{answers.openai}</p>
            {renderGroup(<OpenAiIcon className="h-3.5 w-3.5" />, sources.openai)}
          </details>
        </div>
      )}
      {answers.gemini && (
        <div className="rounded border bg-card/60 p-2">
          <details>
            <summary className="cursor-pointer list-none">
              <span className="inline-flex items-center gap-2 font-semibold"><GeminiIcon className="h-3.5 w-3.5"/> Gemini</span>
              <span className="ml-2 text-muted-foreground">{preview(answers.gemini)}</span>
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-foreground/90">{answers.gemini}</p>
            {renderGroup(<GeminiIcon className="h-3.5 w-3.5" />, sources.gemini)}
          </details>
        </div>
      )}
      {answers.anthropic && (
        <div className="rounded border bg-card/60 p-2">
          <details>
            <summary className="cursor-pointer list-none">
              <span className="inline-flex items-center gap-2 font-semibold"><AnthropicIcon className="h-3.5 w-3.5"/> Claude</span>
              <span className="ml-2 text-muted-foreground">{preview(answers.anthropic)}</span>
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-foreground/90">{answers.anthropic}</p>
            {renderGroup(<AnthropicIcon className="h-3.5 w-3.5" />, sources.anthropic)}
          </details>
        </div>
      )}
      {/* SerpApi static info */}
      <div className="rounded border bg-card/60 p-2">
        <details>
          <summary className="cursor-pointer list-none">
            <span className="inline-flex items-center gap-2 font-semibold"><GoogleIcon className="h-3.5 w-3.5"/> SerpApi</span>
            <span className="ml-2 text-muted-foreground">Google results preview</span>
          </summary>
          <p className="mt-2 text-foreground/90">These links are extracted from Google results via SerpApi.</p>
          {renderGroup(<GoogleIcon className="h-3.5 w-3.5" />, sources.serp)}
        </details>
      </div>
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

function extractAnswersByProvider(payload: any): { openai?: string; gemini?: string; anthropic?: string } {
  const out: { openai?: string; gemini?: string; anthropic?: string } = {};
  try {
    const o = payload?.openai;
    // Responses API common shapes
    const outputArray = Array.isArray(o?.output) ? o.output : [];
    const msg = outputArray.find((x: any) => x?.type === 'message' && Array.isArray(x?.content));
    const msgText = msg ? msg.content.map((p: any) => p?.text).filter(Boolean).join('\n') : '';
    out.openai = o?.output_text
      || msgText
      || (Array.isArray(o?.content) ? o.content.map((c: any) => c?.text).filter(Boolean).join('\n') : '')
      || (o?.choices?.[0]?.message?.content
            ? (Array.isArray(o.choices[0].message.content)
                ? o.choices[0].message.content.map((p: any) => p?.text).filter(Boolean).join('\n')
                : String(o.choices[0].message.content))
            : '');
    if (out.openai) out.openai = String(out.openai).slice(0, 1200);
  } catch {}
  try {
    const g = payload?.gemini;
    const parts = g?.candidates?.[0]?.content?.parts ?? g?.candidates?.[0]?.content?.[0]?.parts ?? [];
    out.gemini = parts.map((p: any) => p?.text).filter(Boolean).join('\n');
    if (out.gemini) out.gemini = String(out.gemini).slice(0, 1200);
  } catch {}
  try {
    const a = payload?.anthropic;
    const blocks = Array.isArray(a?.content) ? a.content : [];
    out.anthropic = blocks.map((b: any) => b?.text).filter(Boolean).join('\n');
    if (out.anthropic) out.anthropic = String(out.anthropic).slice(0, 1200);
  } catch {}
  return out;
}


