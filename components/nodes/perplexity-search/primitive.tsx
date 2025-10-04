import { useCallback, useEffect, useMemo, useState, type ChangeEventHandler, type ComponentProps, type PointerEventHandler } from 'react';
import { useReactFlow } from '@xyflow/react';
import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayIcon, RotateCcwIcon, SearchIcon, GlobeIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PerplexitySearchNodeProps } from '.';
import type { PerplexitySearchResult } from '@/lib/clients/perplexity';

const SUPPORTED_COUNTRIES = ['US', 'GB', 'DE', 'FR', 'ES', 'IT', 'CA', 'AU', 'JP'];

const toQueryPayload = (value: string): string | string[] => {
  const trimmed = value.trim();
  if (!trimmed.includes('|')) {
    return trimmed;
  }
  const parts = trimmed
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return parts[0] ?? '';
  }

  return parts;
};

const normalizeResults = (
  raw?: PerplexitySearchNodeProps['data']['generated']
): {
  grouped: PerplexitySearchResult[][] | null;
  flat: PerplexitySearchResult[] | null;
} => {
  if (!raw?.results) {
    return { grouped: null, flat: null };
  }

  const results = raw.results;
  if (
    Array.isArray(results) &&
    results.length > 0 &&
    Array.isArray(results[0] as PerplexitySearchResult[])
  ) {
    return {
      grouped: results as PerplexitySearchResult[][],
      flat: null,
    };
  }

  return {
    grouped: null,
    flat: results as PerplexitySearchResult[],
  };
};

type PerplexitySearchPrimitiveProps = PerplexitySearchNodeProps & {
  title: string;
};

export const PerplexitySearchPrimitive = ({ id, type, data, title }: PerplexitySearchPrimitiveProps) => {
  const { updateNodeData, getNode } = useReactFlow();
  const [queryInput, setQueryInput] = useState(
    Array.isArray(data.query) ? data.query.join(' | ') : data.query ?? ''
  );
  const [country, setCountry] = useState(data.country ?? 'US');
  const [maxResults, setMaxResults] = useState(data.max_results ?? 5);
  const [maxTokens, setMaxTokens] = useState(data.max_tokens_per_page ?? 1024);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQueryInput(Array.isArray(data.query) ? data.query.join(' | ') : data.query ?? '');
  }, [data.query]);

  const runSearch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const payloadQuery = toQueryPayload(queryInput);
      if ((typeof payloadQuery === 'string' && payloadQuery.length === 0) || (Array.isArray(payloadQuery) && payloadQuery.length === 0)) {
        throw new Error('Please enter a query before running the search.');
      }

      const response = await fetch('/api/tools/perplexity/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: payloadQuery,
          country,
          max_results: maxResults,
          max_tokens_per_page: maxTokens,
        }),
      });

      if (!response.ok) {
        let message = 'Perplexity search failed';
        try {
          const detail = await response.json();
          message = detail?.error ?? message;
        } catch {
          message = await response.text();
        }
        throw new Error(message);
      }

      const json = await response.json();

      updateNodeData(id, {
        query: payloadQuery,
        country,
        max_results: maxResults,
        max_tokens_per_page: maxTokens,
        generated: { results: json.results },
        updatedAt: new Date().toISOString(),
        source: 'primitive',
      });

      toast.success('Perplexity search complete');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [country, id, maxResults, maxTokens, queryInput, updateNodeData]);

  const handleQueryChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const value = event.target.value;
    setQueryInput(value);
    updateNodeData(id, { query: value });
  };

  const handleCountryChange = (value: string) => {
    setCountry(value);
    updateNodeData(id, { country: value });
  };

  const handleMaxResultsChange = (value: number[]) => {
    const next = value[0] ?? maxResults;
    setMaxResults(next);
    updateNodeData(id, { max_results: next });
  };

  const handleMaxTokensChange = (value: number[]) => {
    const next = value[0] ?? maxTokens;
    setMaxTokens(next);
    updateNodeData(id, { max_tokens_per_page: next });
  };

  const toolbar: ComponentProps<typeof NodeLayout>['toolbar'] = useMemo(() => {
    const items: ComponentProps<typeof NodeLayout>['toolbar'] = [
      {
        children: (
          <div className="flex items-center gap-2 px-2">
            <SearchIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Perplexity Search</span>
          </div>
        ),
      },
    ];

    items.push({
      tooltip: data.generated ? 'Run again' : 'Run',
      children: (
        <Button
          size="icon"
          className="rounded-full"
          onClick={runSearch}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : data.generated ? <RotateCcwIcon size={12} /> : <PlayIcon size={12} />}
        </Button>
      ),
    });

    return items;
  }, [data.generated, isLoading, runSearch]);

  const { grouped, flat } = normalizeResults(data.generated);
  const normalizedQueries = Array.isArray(data.query)
    ? data.query
    : data.query
    ? [data.query]
    : [];

  const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    const node = getNode(id);
    if (node?.selected) {
      event.stopPropagation();
    }
  };

  return (
    <NodeLayout
      id={id}
      data={data}
      title={title}
      type={type}
      toolbar={toolbar}
      className="w-[480px] min-h-[600px]"
    >
      <div className="h-full min-h-[560px] overflow-hidden group-data-[selected=true]:overflow-auto group-data-[lock-level=edit]:overflow-hidden">
        <div
          className="pointer-events-auto group-data-[selected=true]:nodrag group-data-[selected=true]:nopan group-data-[lock-level=edit]:pointer-events-none group-data-[lock-level=edit]:select-none"
          onPointerDown={handlePointerDown}
        >
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-2">
              <Input
                value={queryInput}
                onChange={handleQueryChange}
                placeholder='Search query or use "q1 | q2" for multi-query'
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Country</span>
                <Select value={country} onValueChange={handleCountryChange}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <GlobeIcon className="h-3.5 w-3.5" />
                      <SelectValue placeholder="Country" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_COUNTRIES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                  <span>Max results</span>
                  <span>{maxResults}</span>
                </div>
                <Slider min={1} max={20} step={1} value={[maxResults]} onValueChange={handleMaxResultsChange} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                <span>Tokens per page</span>
                <span>{maxTokens}</span>
              </div>
              <Slider min={256} max={2048} step={64} value={[maxTokens]} onValueChange={handleMaxTokensChange} />
            </div>

            <div className="nowheel flex-1 overflow-auto rounded-xl border bg-background/50 p-4">
              {isLoading && (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              )}

              {!isLoading && error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {!isLoading && !error && !flat && !grouped && (
                <p className="text-sm text-muted-foreground">Enter a query and click Run to see results.</p>
              )}

              {!isLoading && !error && flat && (
                <ul className="space-y-3">
                  {flat.map((result, index) => (
                    <li key={`${result.url}-${index}`} className="rounded-lg bg-background p-3 shadow-sm">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline"
                      >
                        {result.title}
                      </a>
                      {result.snippet ? <p className="mt-1 text-xs text-muted-foreground">{result.snippet}</p> : null}
                      {(result.date || result.last_updated) && (
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {result.date ? `Date: ${result.date}` : ''}
                          {result.date && result.last_updated ? ' • ' : ''}
                          {result.last_updated ? `Updated: ${result.last_updated}` : ''}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {!isLoading && !error && grouped && (
                <div className="flex flex-col gap-4">
                  {grouped.map((results, queryIndex) => (
                    <div key={queryIndex} className="rounded-lg border bg-background p-3 shadow-sm">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {normalizedQueries[queryIndex] ?? `Query ${queryIndex + 1}`}
                      </p>
                      <ul className="space-y-3">
                        {results.map((result, index) => (
                          <li key={`${result.url}-${index}`}>
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium underline"
                            >
                              {result.title}
                            </a>
                            {result.snippet ? (
                              <p className="mt-1 text-xs text-muted-foreground">{result.snippet}</p>
                            ) : null}
                            {(result.date || result.last_updated) && (
                              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                                {result.date ? `Date: ${result.date}` : ''}
                                {result.date && result.last_updated ? ' • ' : ''}
                                {result.last_updated ? `Updated: ${result.last_updated}` : ''}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </NodeLayout>
  );
};
