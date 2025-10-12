'use client';

import { NodeLayout } from '@/components/nodes/layout';
import type { SerpApiNodeProps } from './index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useReactFlow } from '@xyflow/react';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { GlobeIcon, Loader2Icon, SearchIcon, XIcon, PlusIcon } from 'lucide-react';
import { SearchResult } from '../perplexity/search-result';
import { useGateway } from '@/providers/gateway/client';
import { ModelSelector } from '../model-selector';
import { GeneratorBar } from '@/components/ui/batch/generator-bar';
import { QueryList } from '@/components/ui/batch/query-list';

const ResultCard = ({ r }: { r: any }) => {
  const url: string | undefined = r?.link || r?.url;
  const title: string | undefined = r?.title || r?.name;
  const snippet: string | undefined = r?.snippet || r?.description;
  const domain = (() => { try { return new URL(url ?? '').hostname; } catch { return ''; }})();
  return (
    <div className="rounded-lg border bg-card/60 p-3">
      <a href={url} target="_blank" rel="noreferrer" className="group">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <GlobeIcon className="h-3.5 w-3.5" />
          <span className="truncate">{domain}</span>
        </div>
        <p className="font-medium group-hover:text-primary line-clamp-1">{title}</p>
      </a>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{snippet}</p>
    </div>
  );
};

export const SerpApiPrimitive = (props: SerpApiNodeProps & { title: string }) => {
  const { updateNodeData } = useReactFlow();
  const { models } = useGateway();
  const data = props.data ?? {};
  const [mode, setMode] = useState<'single' | 'batch' | 'aio'>(data.serpMode ?? 'single');
  const [query, setQuery] = useState<string>(data.query ?? '');
  const [queries, setQueries] = useState<string[]>(data.queries ?? []);
  const [location, setLocation] = useState<string>(data.location ?? 'United States');
  const [hl, setHl] = useState<string>(data.hl ?? 'en');
  const [gl, setGl] = useState<string>(data.gl ?? 'US');
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState<'search' | 'aio'>('search');
  const [noCache, setNoCache] = useState(false);
  const [googleDomain, setGoogleDomain] = useState('google.com');
  const [showDebug, setShowDebug] = useState(false);
  const [locQuery, setLocQuery] = useState('');
  const [locOptions, setLocOptions] = useState<Array<{ canonical_name: string }>>([]);

  // Text-capable models for question generation (one-line bar)
  const filterTextModels = (ms: Record<string, any>) =>
    Object.fromEntries(
      Object.entries(ms).filter(([id, m]: any) => {
        const isOpenAI = m?.chef?.id === 'openai' || (Array.isArray(m?.providers) && m.providers.some((p: any) => p.id === 'openai'));
        if (!isOpenAI) return false;
        const label = String(m?.label ?? '').toLowerCase();
        return ['gpt-4.1','gpt-4.1 mini','gpt-4.1 nano','gpt-4o mini','gpt-5','gpt-5 mini','gpt-5 nano'].some((s) => label.includes(s))
          || ['gpt-4.1','gpt-4.1-mini','gpt-4.1-nano','gpt-4o-mini','gpt-5','gpt-5-mini','gpt-5-nano'].includes(id);
      })
    );
  const textModels = useMemo(() => filterTextModels(models), [models]);
  const [genModel, setGenModel] = useState<string>(Object.keys(textModels)[0]);
  const [genPrompt, setGenPrompt] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  useEffect(() => { if (!genModel && Object.keys(textModels).length) setGenModel(Object.keys(textModels)[0]); }, [textModels, genModel]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!locQuery) { setLocOptions([]); return; }
      try {
        const res = await fetch(`/api/serpapi/locations?q=${encodeURIComponent(locQuery)}&limit=12`);
        const json = await res.json();
        setLocOptions(Array.isArray(json) ? json : []);
      } catch { setLocOptions([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [locQuery]);

  const toolbar: ComponentProps<typeof NodeLayout>['toolbar'] = [
    {
      children: (
        <div className="inline-flex rounded-md border p-0.5">
          {(['single','batch'] as const).map((m) => (
            <Button key={m} size="sm" variant={mode===m? 'default':'ghost'} onClick={() => setMode(m)}>
              {m === 'single' ? 'Single' : 'Batch'}
            </Button>
          ))}
        </div>
      ),
    },
  ];

  const deriveOutputs = (json: any) => {
    const organic = json?.organic_results ?? json?.results ?? [];
    const texts: string[] = [];
    const links: string[] = [];
    for (const r of organic) {
      const t = [r?.title, r?.snippet].filter(Boolean).join(' — ');
      if (t) texts.push(t);
      if (r?.link) links.push(r.link);
    }
    return { texts, links };
  };

  const renderAio = (root: any) => {
    let ai = root?.ai_overview || root?.aiOverview || root;
    // serpapi_link responses often nest ai_overview.ai_overview
    if (ai?.ai_overview) ai = ai.ai_overview;
    const textBlocks: any[] = Array.isArray(ai?.text_blocks) ? ai.text_blocks : [];
    const text = ai?.answer?.text || ai?.content || ai?.summary || (textBlocks.length ? '' : '');
    const links: string[] = [];
    const pushLinks = (arr: any[]) => {
      for (const it of arr || []) {
        const u = it?.link || it?.url || it;
        if (typeof u === 'string') links.push(u);
      }
    };
    pushLinks(ai?.references || ai?.citations || ai?.sources || ai?.links || []);
    const renderBlocks = (blocks: any[]): React.ReactElement => {
      return (
        <div className="space-y-3">
          {blocks.map((b, i) => {
            if (!b) return null as any;
            if (b.type === 'heading') {
              return <div key={i} className="text-sm font-semibold">{b.snippet}</div>;
            }
            if (b.type === 'paragraph') {
              // Could include video
              return (
                <div key={i} className="text-sm leading-snug whitespace-pre-wrap">
                  {b.snippet}
                  {b.video?.link && (
                    <div className="mt-2 text-xs">
                      <a href={b.video.link} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">{b.video.link}</a>
                    </div>
                  )}
                </div>
              );
            }
            if (b.type === 'list') {
              const items: any[] = Array.isArray(b.list) ? b.list : [];
              return (
                <ul key={i} className="ml-4 list-disc space-y-1 text-sm">
                  {items.map((li, j) => (
                    <li key={j} className="leading-snug">
                      <span className="font-medium">{li.title}</span> {li.snippet}
                      {Array.isArray(li.list) && li.list.length ? (
                        <ul className="ml-4 list-[circle] space-y-1">
                          {li.list.map((sub: any, k: number) => (
                            <li key={k}>{sub.snippet}</li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              );
            }
            if (b.type === 'expandable') {
              return (
                <details key={i} className="rounded-md border bg-card/60 p-3">
                  <summary className="cursor-pointer text-sm font-medium">{b.title || b.subtitle || 'Details'}</summary>
                  {Array.isArray(b.text_blocks) && b.text_blocks.length ? (
                    <div className="mt-2">{renderBlocks(b.text_blocks)}</div>
                  ) : null}
                </details>
              );
            }
            if (b.type === 'table' && Array.isArray(b.table)) {
              return (
                <div key={i} className="overflow-auto rounded-md border bg-card/60">
                  <table className="w-full text-left text-xs">
                    <tbody>
                      {b.table.map((row: any[], rIdx: number) => (
                        <tr key={rIdx} className={rIdx===0? 'font-semibold' : ''}>
                          {row.map((cell: any, cIdx: number) => (
                            <td key={cIdx} className="border-b p-2">{String(cell)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            return null as any;
          })}
        </div>
      );
    };
    return (
      <div className="space-y-4">
        {text ? (
          <div className="rounded-lg border bg-card/60 p-4 whitespace-pre-wrap text-sm">{text}</div>
        ) : (
          renderBlocks(textBlocks)
        )}
        {!!links.length && (
          <div className="grid grid-cols-2 gap-3">
            {links.slice(0, 10).map((u, i) => (
              <SearchResult key={i} result={{ url: u, title: u, snippet: u }} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const run = async () => {
    try {
      setLoading(true);
      if (mode === 'single') {
        if (engine === 'search') {
          const res = await fetch('/api/serpapi/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: query, location, hl, gl, no_cache: noCache, google_domain: googleDomain }) });
          const json = await res.json();
          const { texts, links } = deriveOutputs(json);
          updateNodeData(props.id, { results: json?.organic_results ?? [], outputTexts: texts, outputLinks: links, serpMode: mode, updatedAt: new Date().toISOString() });
        } else {
          const res = await fetch('/api/serpapi/ai-overview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: query, location, hl, gl, no_cache: noCache, google_domain: googleDomain }) });
          const json = await res.json();
          updateNodeData(props.id, { results: [json], outputTexts: [], outputLinks: [], serpMode: mode, updatedAt: new Date().toISOString() });
        }
      } else {
        // batch, support both engines
        const res = await fetch('/api/serpapi/batch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: engine === 'search' ? 'search' : 'aio', queries, location, hl, gl }) });
        const arr = await res.json();
        const flat = (arr ?? []).flatMap((row: any) => (row?.ok ? row?.data?.organic_results ?? [] : []));
        const { texts, links } = deriveOutputs({ organic_results: flat });
        updateNodeData(props.id, { results: flat, outputTexts: texts, outputLinks: links, serpMode: mode, updatedAt: new Date().toISOString() });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <NodeLayout
      id={props.id}
      data={{ ...props.data, width: 1280, height: 880, resizable: false, allowIncoming: false, allowOutgoing: true, titleOverride: 'Google Search Results' }}
      type={props.type}
      title={props.title}
      toolbar={toolbar}
    >
      <div className="flex h-full flex-col min-h-0 p-3">
        {/* Header Controls */}
        <div className="shrink-0 rounded-2xl border bg-card/60 p-2 mb-2">
          <div className="flex flex-nowrap items-center gap-2 overflow-hidden">
            {/* Single/Batch moved to toolbar to match AI Compare */}
            {/* Engine toggle */}
            <div className="inline-flex rounded-md border p-0.5">
              <Button size="sm" variant={engine==='search'?'default':'ghost'} onClick={() => setEngine('search')}>Search</Button>
              <Button size="sm" variant={engine==='aio'?'default':'ghost'} onClick={() => setEngine('aio')}>AI Overview</Button>
            </div>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter query…" className="w-[320px]" />
            <div className="relative">
              <Input
                value={location}
                onChange={(e) => { setLocation(e.target.value); setLocQuery(e.target.value); }}
                placeholder="Search locations…"
                className="w-[160px]"
              />
              {!!locOptions.length && (
                <div className="absolute z-50 mt-1 max-h-56 w-[160px] overflow-auto rounded-md border bg-card shadow">
                  {locOptions.map((l, i) => (
                    <button key={i} className="block w-full truncate px-2 py-1 text-left hover:bg-accent" onClick={() => { setLocation(l.canonical_name); setLocOptions([]); setLocQuery(''); }}>
                      {l.canonical_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input value={hl} onChange={(e) => setHl(e.target.value)} placeholder="hl" className="w-[64px]" />
            <Input value={gl} onChange={(e) => setGl(e.target.value)} placeholder="gl" className="w-[64px]" />
            <Input value={googleDomain} onChange={(e)=> setGoogleDomain(e.target.value)} placeholder="google.com" className="w-[120px]" />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={noCache} onChange={(e)=> setNoCache(e.target.checked)} /> Force fresh
            </label>
            <Button onClick={() => void run()} disabled={loading}><SearchIcon className="mr-2 h-4 w-4"/>Run</Button>
          </div>
        </div>

        {/* Batch Generate Questions (Perplexity-style) */}
        {mode === 'batch' && (
          <div className="shrink-0 mt-3 mb-2">
            <GeneratorBar
              model={genModel}
              models={textModels}
              onModelChange={setGenModel}
              prompt={genPrompt}
              onPromptChange={setGenPrompt}
              onGenerate={async () => {
                if (!genPrompt.trim()) return;
                setGenLoading(true);
                try {
                  const resp = await fetch('/api/perplexity/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'generate_questions', prompt: genPrompt, model: genModel }) });
                  const json = await resp.json();
                  const next = Array.isArray(json?.questions) ? json.questions : [];
                  setQueries((prev) => [...prev, ...next]);
                } catch {}
                setGenLoading(false);
              }}
              generating={genLoading}
            />
          </div>
        )}

        {/* Results */}
        {mode === 'single' ? (
          <div className="nowheel nodrag nopan flex-1 min-h-0 overflow-auto rounded-2xl border bg-card/60 p-3" onPointerDown={(e) => e.stopPropagation()}>
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2Icon className="h-6 w-6 animate-spin"/></div>
            ) : (Array.isArray(props.data?.results) && props.data.results.length ? (
              engine === 'search' ? (
                <div className="grid grid-cols-2 gap-3">
                  {(props.data.results as any[]).map((r, i) => (
                    <SearchResult key={i} result={{ url: r?.link || r?.url, title: r?.title, snippet: r?.snippet }} variant="card" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">AI Overview</div>
                    <button className="text-xs text-emerald-700 hover:underline" onClick={()=> setShowDebug((v)=> !v)}>{showDebug ? 'Hide debug' : 'Show debug'}</button>
                  </div>
                  {renderAio((props.data.results as any[])[0])}
                  {showDebug && (
                    <pre className="rounded bg-black p-3 text-xs text-white overflow-auto max-h-72">{JSON.stringify((props.data.results as any[])[0], null, 2)}</pre>
                  )}
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Run a search to see results.</div>
            ))}
          </div>
        ) : (
          <div className="grid h-full min-h-0 grid-cols-12 gap-3">
            {/* Left: queries editor */}
            <div className="col-span-4 min-h-0 overflow-auto rounded-xl border bg-card/60 p-3">
              <QueryList
                queries={queries}
                onChange={setQueries}
                selectedIndex={0}
                onSelect={()=>{}}
                onAdd={() => setQueries([...queries, ''])}
                onRun={run}
                statuses={[]}
                running={loading}
              />
            </div>
            {/* Right: results */}
            <div className="col-span-8 min-h-0 overflow-auto rounded-xl border bg-card/60 p-3">
              {loading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2Icon className="h-6 w-6 animate-spin"/></div>
              ) : (Array.isArray(props.data?.results) && props.data.results.length ? (
                <div className="grid grid-cols-2 gap-3">
                  {(props.data.results as any[]).map((r, i) => (
                    <SearchResult key={i} result={{ url: r?.link || r?.url, title: r?.title, snippet: r?.snippet }} variant="card" />
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Run a batch to see results.</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </NodeLayout>
  );
};

// --- Batch Generate Questions section (Perplexity-style) ---
const OPENAI_WHITELIST_IDS = new Set([
  'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o-mini', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano',
]);
const OPENAI_WHITELIST_LABELS = [
  'gpt-4.1', 'gpt-4.1 mini', 'gpt-4.1 nano', 'gpt-4o mini', 'gpt-5', 'gpt-5 mini', 'gpt-5 nano',
];
const BatchGenerateSection = ({ nodeId }: { nodeId: string }) => {
  const { updateNodeData } = useReactFlow();
  const { models } = useGateway();
  const filteredModels = useMemo(() => Object.fromEntries(
    Object.entries(models).filter(([id, m]: any) => {
      const isOpenAI = m?.chef?.id === 'openai' || (Array.isArray(m?.providers) && m.providers.some((p: any) => p.id === 'openai'));
      if (!isOpenAI) return false;
      const label = String(m?.label ?? '').toLowerCase();
      return OPENAI_WHITELIST_IDS.has(id) || OPENAI_WHITELIST_LABELS.some((s) => label.includes(s));
    })
  ), [models]);
  const defaultModel = useMemo(() => Object.keys(filteredModels)[0], [filteredModels]);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(defaultModel);
  const [loading, setLoading] = useState(false);
  const onGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/perplexity/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'generate_questions', prompt, model })
      });
      const data = await response.json();
      const newQs: string[] = data?.questions ?? [];
      const merged = [...(typeof (window as any) !== 'undefined' ? [] : []), ...newQs];
      // Update local state and node data so UI reflects immediately
      updateNodeData(nodeId, (prev: any) => {
        const current = Array.isArray(prev?.queries) ? prev.queries : [];
        const next = [...current, ...newQs];
        return { serpMode: 'batch', queries: next, updatedAt: new Date().toISOString() } as any;
      });
    } finally { setLoading(false); }
  };
  return (
    <div className="shrink-0 rounded-2xl border bg-card/60 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-xs text-muted-foreground">Generate Questions</div>
        <div className="flex items-center gap-2">
          <ModelSelector value={model} options={filteredModels} className="w-[220px] rounded-full" onChange={setModel as any} />
          <Button size="sm" onClick={onGenerate} disabled={loading || !prompt.trim()}>{loading ? 'Generating…' : 'Generate'}
          </Button>
        </div>
      </div>
      <Textarea value={prompt} onChange={(e)=> setPrompt(e.target.value)} placeholder="Describe the kind of questions you want to generate…" rows={3} />
    </div>
  );
};


