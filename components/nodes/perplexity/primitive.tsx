'use client';

import { useState, useEffect } from 'react';
import { NodeLayout } from '@/components/nodes/layout';
import type { PerplexityNodeProps } from './index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchResult } from './search-result';
import { useReactFlow } from '@xyflow/react';
import { getIncomers } from '@xyflow/react';
import { getTextFromTextNodes, getMarkdownFromFirecrawlNodes, getTextFromTiptapNodes } from '@/lib/xyflow';
import { XIcon, PlusIcon, CheckIcon, Loader2Icon } from 'lucide-react';
import type { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import { useGateway } from '@/providers/gateway/client';
import { ModelSelector } from '../model-selector';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PerplexityIcon } from '@/lib/icons';

// Helper copied from Text node to choose a sensible default
const DEFAULT_TEXT_MODEL_ID = 'gpt-5-mini';
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
const getDefaultModel = (models: Record<string, any>) => {
  if (models[DEFAULT_TEXT_MODEL_ID]) return DEFAULT_TEXT_MODEL_ID;
  const firstAllowed = Object.entries(models).find(([id, m]: any) => {
    const label = String(m?.label ?? '').toLowerCase();
    return OPENAI_WHITELIST_IDS.has(id) || OPENAI_WHITELIST_LABELS.some((s) => label.includes(s));
  });
  return firstAllowed?.[0] ?? Object.keys(models)[0];
};

// Perplexity-only model filter (for model-based query mode)
const filterPerplexityModels = (models: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(models).filter(([_, m]: any) => {
      const isPerplexity = m?.chef?.id === 'perplexity' || (Array.isArray(m?.providers) && m.providers.some((p: any) => p.id === 'perplexity'));
      return isPerplexity;
    })
  );

// Map gateway ids like "perplexity/sonar-pro" -> API ids like "sonar-pro"
const normalizePxModel = (id: string | undefined) => {
  if (!id) return 'sonar';
  const clean = id.replace(/^perplexity\//i, '');
  if (/pro/i.test(clean)) return 'sonar-pro';
  // default family model
  return 'sonar';
};

type PerplexityPrimitiveProps = PerplexityNodeProps & { title: string };

export const PerplexityPrimitive = (props: PerplexityPrimitiveProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const { models } = useGateway();

  // Allowed models for Generate (OpenAI only, explicit list)
  const filteredModels = Object.fromEntries(
    Object.entries(models).filter(([id, m]: any) => {
      const isOpenAI = m?.chef?.id === 'openai' || (Array.isArray(m?.providers) && m.providers.some((p: any) => p.id === 'openai'));
      if (!isOpenAI) return false;
      const label = String(m?.label ?? '').toLowerCase();
      return OPENAI_WHITELIST_IDS.has(id) || OPENAI_WHITELIST_LABELS.some((s) => label.includes(s));
    })
  );

  // Get persisted state from data prop, with defaults
  const inputMode = props.data.inputMode ?? 'single';
  const queries = props.data.queries ?? [''];
  const generatePrompt = props.data.generatePrompt ?? '';
  const model = props.data.model ?? getDefaultModel(filteredModels);
  const pxModels = filterPerplexityModels(models);
  const pxModel = normalizePxModel((props.data as any)?.pxModel ?? Object.keys(pxModels)[0]);
  const pxMode = (props.data as any)?.pxMode ?? 'search'; // 'search' | 'model'
  const searchSingleResults = props.data.searchSingleResults ?? [];
  const searchBatchResults = props.data.searchBatchResults ?? [];
  const generatedQuestions = props.data.generatedQuestions ?? [];
  const batchStatuses = props.data.batchStatuses ?? [] as Array<'idle'|'running'|'done'|'error'>;
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const batchEdit = (props.data as any)?.batchEdit ?? true;
  const modelSingleAnswer = (props.data as any)?.modelSingleAnswer ?? '';
  const modelSingleCitations = (props.data as any)?.modelSingleCitations ?? [] as string[];
  const modelBatchAnswers = (props.data as any)?.modelBatchAnswers ?? [] as Array<{ answer: string; citations: string[] }>;

  const [isLoading, setIsLoading] = useState(false);

  // Normalize persisted size to current defaults so existing nodes pick up the reduced height
  useEffect(() => {
    const currentW = (props.data as any)?.width;
    const currentH = (props.data as any)?.height;
    const updates: any = {};
    if (typeof currentW === 'number' && currentW !== 1200) updates.width = 1200;
    if (typeof currentH === 'number' && currentH !== 740) updates.height = 740;
    if (Object.keys(updates).length) {
      updateNodeData(props.id, updates);
    }
  }, [props.id, props.data, updateNodeData]);

  const deriveOutputsFromResults = (results: any[] | { query: string; results: any[] }[]) => {
    const flat: any[] = Array.isArray(results) && results.length > 0 && 'query' in (results[0] as any)
      ? (results as any[]).flatMap((g: any) => g.results ?? [])
      : (results as any[]);
    const texts = (flat ?? []).map((r: any) => {
      const title = r?.title ?? '';
      const snippet = r?.snippet ?? r?.text ?? '';
      return [title, snippet].filter(Boolean).join(' — ');
    }).filter(Boolean);
    const links = (flat ?? []).map((r: any) => r?.url).filter(Boolean);
    return { texts, links };
  };

  // Derived state for button disabling
  const isSearchDisabled = isLoading || (inputMode === 'single' && !queries[0]?.trim());
  const isBatchSearchDisabled = isLoading || queries.filter((q: string) => q.trim()).length === 0;
  const isGenerateDisabled = isLoading || !generatePrompt.trim();

  const toolbar: ComponentProps<typeof NodeLayout>['toolbar'] = [
    { children: <div className="px-2 text-xs text-muted-foreground">Perplexity Search</div> },
  ];

  // --- UI Handlers ---
  const setInputMode = (value: string) => updateNodeData(props.id, { inputMode: value });

  // Batch Mode Handlers
  const updateQuery = (index: number, value: string) => {
    const newQueries = [...queries];
    newQueries[index] = value;
    updateNodeData(props.id, { queries: newQueries });
  };

  const addQuery = () => updateNodeData(props.id, { queries: [...queries, ''] });
  const removeQuery = (index: number) => {
    const newQueries = queries.filter((_: any, i: number) => i !== index);
    updateNodeData(props.id, { queries: newQueries });
  };

  // --- Data Fetching ---
  const handleSearch = async () => {
    // --- Validation ---
    const validQueries = queries.filter((q: string) => q.trim());
    if (inputMode === 'single' && !validQueries[0]) return;
    if (inputMode === 'batch' && validQueries.length === 0) return;

    setIsLoading(true);
    const body = pxMode === 'model'
      ? { mode: 'chat', messages: [{ role: 'user', content: (inputMode === 'single' ? validQueries[0] : validQueries).toString() }], model: pxModel }
      : { mode: 'search', query: inputMode === 'single' ? validQueries[0] : validQueries } as const;

    try {
      const response = await fetch('/api/perplexity/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        // Handle non-JSON error responses gracefully
        const errorText = await response.text();
        throw new Error(errorText || 'API request failed');
      }

      const data = await response.json();

      if (pxMode === 'model') {
        const text = data?.choices?.[0]?.message?.content ?? '';
        const citations: string[] = Array.isArray(data?.citations) ? data.citations : [];
        updateNodeData(props.id, { modelSingleAnswer: text, modelSingleCitations: citations, outputTexts: [text], outputLinks: citations, searchSingleResults: [] });
        return;
      }
      if (inputMode === 'single') {
        const single = data.results ?? [];
        const out = deriveOutputsFromResults(single);
        updateNodeData(props.id, { searchSingleResults: single, outputTexts: out.texts, outputLinks: out.links });
      } else {
        // batch: backend returns grouped [{ query, results: [...] }] or flat
        const grouped = Array.isArray(data) ? data : [];
        const nextResults = grouped.length ? grouped : (data.results ?? []);
        const statuses = Array.from({ length: (grouped.length || validQueries.length) }, () => 'done');
        const out = deriveOutputsFromResults(nextResults as any);
        updateNodeData(props.id, { searchBatchResults: nextResults, batchStatuses: statuses as any, outputTexts: out.texts, outputLinks: out.links });
      }
    } catch (error) {
      console.error('Perplexity API request failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Progressive batch runner with per-query status
  const runBatchProgressive = async () => {
    const validQueries = queries.map((q: string) => q.trim()).filter(Boolean);
    if (!validQueries.length) return;
    setIsBatchRunning(true);
    // initialize statuses and results containers; preserve results from the other mode
    const initStatuses = validQueries.map(() => 'idle') as Array<'idle'|'running'|'done'|'error'>;
    // clear only the active mode's container for a fresh run
    if (pxMode === 'model') {
      updateNodeData(props.id, { batchStatuses: initStatuses, modelBatchAnswers: [] });
    } else {
      updateNodeData(props.id, { batchStatuses: initStatuses, searchBatchResults: [] });
    }

    const groups: any[] = [];
    const answers: Array<{ answer: string; citations: string[] }> = [];
    for (let i = 0; i < validQueries.length; i++) {
      const q = validQueries[i];
      // mark running
      const nextStatuses = [...(initStatuses.length === validQueries.length ? initStatuses : (props.data.batchStatuses ?? initStatuses))];
      nextStatuses[i] = 'running';
      updateNodeData(props.id, { batchStatuses: nextStatuses, selectedQueryIndex: i });
      try {
        const payload = pxMode === 'model'
          ? { mode: 'chat', messages: [{ role: 'user', content: q }], model: pxModel }
          : { mode: 'search', query: q };
        const resp = await fetch('/api/perplexity/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(txt || 'API error');
        }
        const data = await resp.json();
        if (pxMode === 'model') {
          const text = data?.choices?.[0]?.message?.content ?? '';
          const citations: string[] = Array.isArray(data?.citations) ? data.citations : [];
          answers[i] = { answer: text, citations };
          // surface outputs for downstream nodes
          updateNodeData(props.id, { modelBatchAnswers: [...answers], outputTexts: [text], outputLinks: citations });
          const doneStatuses = [...nextStatuses];
          doneStatuses[i] = 'done';
          updateNodeData(props.id, { batchStatuses: doneStatuses });
        } else {
          const results = (data.results ?? []);
          groups[i] = { query: q, results };
          const out = deriveOutputsFromResults(groups as any);
          updateNodeData(props.id, { searchBatchResults: [...groups], outputTexts: out.texts, outputLinks: out.links });
          const doneStatuses = [...nextStatuses];
          doneStatuses[i] = 'done';
          updateNodeData(props.id, { batchStatuses: doneStatuses });
        }
      } catch (e) {
        const errStatuses = [...(props.data.batchStatuses ?? initStatuses)];
        errStatuses[i] = 'error';
        updateNodeData(props.id, { batchStatuses: errStatuses });
      }
    }
    setIsBatchRunning(false);
  };
  
  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/perplexity/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate_questions',
          prompt: generatePrompt,
          model,
        }),
      });
      const data = await response.json();
      if (data.questions) {
        updateNodeData(props.id, { generatedQuestions: data.questions });
      }
    } catch (error) {
      console.error('Question generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate tab helpers
  const updateGeneratedQuestion = (index: number, value: string) => {
    const next = [...generatedQuestions];
    next[index] = value;
    updateNodeData(props.id, { generatedQuestions: next });
  };
  const addGeneratedQuestion = () => updateNodeData(props.id, { generatedQuestions: [...generatedQuestions, ''] });
  const removeGeneratedQuestion = (index: number) => {
    const next = generatedQuestions.filter((_: any, i: number) => i !== index);
    updateNodeData(props.id, { generatedQuestions: next });
  };
  const sendToBatch = () => {
    if (!generatedQuestions.length) return;
    updateNodeData(props.id, { inputMode: 'batch', queries: generatedQuestions, selectedQueryIndex: 0 });
  };
  // removed Send & Run per request

  // Seed Batch from connected sources when empty
  const seedFromIncomers = () => {
    const incomers = getIncomers({ id: props.id }, getNodes(), getEdges());
    const text = [
      ...getTextFromTextNodes(incomers),
      ...getMarkdownFromFirecrawlNodes(incomers),
      ...getTextFromTiptapNodes(incomers),
    ].filter(Boolean);
    if (text.length && (!queries || queries.every((q) => !q))) {
      const seeded = text.slice(0, 10); // cap
      updateNodeData(props.id, { queries: seeded, inputMode: 'batch' });
    }
  };

  // On mount or when switching to batch, try seeding
  if (inputMode === 'batch') {
    try { seedFromIncomers(); } catch {}
  }


  return (
    <NodeLayout
      {...props}
      toolbar={toolbar}
      data={{ ...props.data, width: props.data.width ?? 1200, height: props.data.height ?? 740, resizable: false, fullscreenSupported: true, fullscreenOnly: false, allowIncoming: false, allowOutgoing: true }}
    >
      <div className="flex h-full min-h-0 flex-col gap-3 p-3">
        {/* Header Controls */}
        <div className="shrink-0 flex items-center justify-between gap-2 rounded-2xl border bg-card/60 p-2">
            <div className="inline-flex rounded-md border p-0.5">
                <Button variant={inputMode === 'single' ? 'default' : 'ghost'} size="sm" onClick={() => setInputMode('single')}>Single</Button>
                <Button variant={inputMode === 'batch' ? 'default' : 'ghost'} size="sm" onClick={() => setInputMode('batch')}>Batch</Button>
                <Button variant={inputMode === 'generate' ? 'default' : 'ghost'} size="sm" onClick={() => setInputMode('generate')}>Generate</Button>
            </div>
            {/* Mode within Single/Batch: Search API vs Perplexity model */}
            {inputMode !== 'generate' && (
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-md border p-0.5">
                  <Button
                    variant={pxMode === 'search' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => updateNodeData(props.id, { pxMode: 'search', /* preserve other state */ })}
                  >
                    Search API
                  </Button>
                  <Button
                    variant={pxMode === 'model' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => updateNodeData(props.id, { pxMode: 'model' })}
                  >
                    Perplexity model
                  </Button>
                </div>
                {pxMode === 'model' && (
                  <ModelSelector
                    value={(props.data as any)?.pxModel ?? Object.keys(pxModels)[0]}
                    options={pxModels}
                    className="w-[220px] rounded-full"
                    onChange={(v) => updateNodeData(props.id, { pxModel: v })}
                  />
                )}
              </div>
            )}
        </div>

        {/* Dynamic Input Area */}
        <div className={inputMode === 'generate' ? 'flex-1 min-h-0' : 'shrink-0'}>
          {inputMode === 'single' && (
            <div className="flex items-center gap-2">
              <Input value={queries[0]} onChange={(e) => updateQuery(0, e.target.value)} placeholder="Enter your search query..."/>
              <Button
                onClick={handleSearch}
                disabled={isSearchDisabled}
                className="inline-flex items-center gap-2 text-white"
                style={{ backgroundColor: '#059669' }}
              >
                {isLoading ? 'Searching…' : 'Search with Perplexity'}
                {!isLoading && <PerplexityIcon className="h-4 w-4 text-white" />}
              </Button>
            </div>
          )}
          {/* Batch inputs are rendered in the left pane of the split view below */}
          {inputMode === 'generate' && (
            <div className="h-full rounded-2xl border bg-card/60 p-3 flex flex-col gap-2 min-h-0">
                <Textarea placeholder="Describe the kind of questions you want to generate..." value={generatePrompt} onChange={(e) => updateNodeData(props.id, { generatePrompt: e.target.value })}/>
                <div className="flex justify-between items-center">
                    <ModelSelector
                      value={model}
                      options={filteredModels}
                      className="w-[240px] rounded-full"
                      onChange={(v) => updateNodeData(props.id, { model: v })}
                    />
                    <Button onClick={handleGenerate} disabled={isGenerateDisabled}>{isLoading ? 'Generating...' : 'Generate Queries'}</Button>
                </div>
                {/* Editable generated list */}
                <div className="rounded-xl border bg-card/60 p-3 flex-1 min-h-0 flex flex-col">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Generated questions</p>
                  <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-auto">
                    {generatedQuestions.map((q: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input value={q} onChange={(e) => updateGeneratedQuestion(i, e.target.value)} />
                        <Button variant="ghost" size="icon" onClick={() => removeGeneratedQuestion(i)}>
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={addGeneratedQuestion}><PlusIcon className="mr-2 h-4 w-4"/>Add</Button>
                    <Button
                      size="sm"
                      onClick={sendToBatch}
                      disabled={!generatedQuestions.length}
                      className="text-white"
                      style={{ backgroundColor: '#32B9C6' }}
                    >
                      Send to Batch
                    </Button>
                  </div>
                </div>
            </div>
          )}
        </div>

        {/* Results View (hidden in Generate tab) */}
        {inputMode !== 'generate' && (
        <div className="nowheel flex-1 overflow-auto rounded-2xl border bg-card/60 p-3 min-h-0">
            {isLoading && <p className="text-xs text-muted-foreground">Loading...</p>}

            {inputMode === 'single' && (
              pxMode === 'model' ? (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-card/60 p-4">
                    <ReactMarkdown>{modelSingleAnswer}</ReactMarkdown>
                  </div>
                  {Array.isArray(modelSingleCitations) && modelSingleCitations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {modelSingleCitations.slice(0, 6).map((u: string, i: number) => (
                        <SearchResult key={i} result={{ title: u, snippet: u, url: u }} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(searchSingleResults as any[]).map((res: any, i: number) => (
                    <SearchResult key={i} result={res} variant="card" />
                  ))}
                </div>
              )
            )}

            {inputMode === 'batch' && (
              <div className="grid h-full min-h-0 grid-cols-12 gap-3">
                <div className="col-span-4 min-h-0 overflow-auto rounded-xl border bg-card/60 p-3">
                  <div className="flex h-full min-h-0 flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div />
                      <Button variant="ghost" size="sm" onClick={() => updateNodeData(props.id, { batchEdit: !batchEdit })}>
                        {batchEdit ? 'Done' : 'Edit'}
                      </Button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto space-y-2">
                      {queries.map((q: string, idx: number) => (
                        batchEdit ? (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              value={q}
                              onChange={(e) => updateQuery(idx, e.target.value)}
                              onFocus={() => updateNodeData(props.id, { selectedQueryIndex: idx })}
                            />
                            {/* Status indicator */}
                            {Array.isArray(batchStatuses) && batchStatuses[idx] === 'running' && (
                              <Loader2Icon className="h-4 w-4 animate-spin text-primary" />
                            )}
                            {Array.isArray(batchStatuses) && batchStatuses[idx] === 'done' && (
                              <CheckIcon className="h-4 w-4 text-green-600" />
                            )}
                            {Array.isArray(batchStatuses) && batchStatuses[idx] === 'error' && (
                              <XIcon className="h-4 w-4 text-red-600" />
                            )}
                            <Button variant="ghost" size="icon" onClick={() => removeQuery(idx)}>
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            key={idx}
                            className="flex w-full items-center justify-between rounded-xl border bg-card/60 px-3 py-2 text-left text-sm hover:bg-muted/50"
                            onClick={() => updateNodeData(props.id, { selectedQueryIndex: idx })}
                          >
                            <span className="block truncate">{q || `Query #${idx + 1}`}</span>
                            <span className="ml-2 inline-flex items-center">
                              {Array.isArray(batchStatuses) && batchStatuses[idx] === 'running' && (
                                <Loader2Icon className="h-4 w-4 animate-spin text-primary" />
                              )}
                              {Array.isArray(batchStatuses) && batchStatuses[idx] === 'done' && (
                                <CheckIcon className="h-4 w-4 text-green-600" />
                              )}
                              {Array.isArray(batchStatuses) && batchStatuses[idx] === 'error' && (
                                <XIcon className="h-4 w-4 text-red-600" />
                              )}
                            </span>
                          </button>
                        )
                      ))}
                    </div>
                    <div className="flex shrink-0 items-center justify-between pt-2">
                      <Button variant="outline" size="sm" onClick={addQuery}>
                        <PlusIcon className="mr-2 h-4 w-4" /> Add Query
                      </Button>
                      <Button onClick={runBatchProgressive} disabled={isBatchSearchDisabled || isBatchRunning} size="sm" className="inline-flex items-center gap-2 text-white" style={{ backgroundColor: '#059669' }}>
                        {isBatchRunning ? 'Running…' : 'Run Batch'}
                        {!isBatchRunning && <PerplexityIcon className="h-4 w-4 text-white" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="col-span-8 min-h-0 overflow-auto rounded-xl border bg-card/60 p-3">
                  {(() => {
                    const idx = (props.data as any)?.selectedQueryIndex ?? 0;
                    if (pxMode === 'model') {
                      if (Array.isArray(modelBatchAnswers) && modelBatchAnswers[idx]) {
                        const ans = modelBatchAnswers[idx];
                        return (
                          <div className="space-y-3">
                            <div className="rounded-lg border bg-card/60 p-3 text-sm font-medium text-foreground/80">
                              {queries[idx] || `Query #${idx + 1}`}
                            </div>
                            <div className="rounded-lg border bg-card/60 p-4">
                              <ReactMarkdown>{ans.answer}</ReactMarkdown>
                            </div>
                            {Array.isArray(ans.citations) && ans.citations.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {ans.citations.slice(0, 6).map((u: string, j: number) => (
                                  <SearchResult key={j} result={{ title: u, snippet: u, url: u }} />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          No model answer yet. Run Batch.
                        </div>
                      );
                    }
                    // pxMode === 'search'
                    if (Array.isArray(searchBatchResults) && searchBatchResults.length > 0 && typeof searchBatchResults[0] === 'object' && 'query' in (searchBatchResults[0] as any)) {
                      const group = (searchBatchResults as any[])[idx];
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          {group?.results?.map((res: any, j: number) => (
                            <SearchResult key={`${idx}-${j}`} result={res} variant="card" />
                          ))}
                        </div>
                      );
                    }
                    if (Array.isArray(searchBatchResults) && searchBatchResults.length > 0) {
                      const flat = searchBatchResults as any[];
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          {flat.map((res: any, j: number) => (
                            <SearchResult key={j} result={res} variant="card" />
                          ))}
                        </div>
                      );
                    }
                    return (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No search results yet. Run Batch.
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
        </div>
        )}
      </div>
    </NodeLayout>
  );
};
