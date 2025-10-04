import { useEffect, useMemo, useState, useCallback } from 'react';
import { getIncomers, useReactFlow } from '@xyflow/react';
import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getTextFromTextNodes } from '@/lib/xyflow';
import { Loader2, PlayIcon, RotateCcwIcon, SearchIcon, SquareIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { ComponentProps } from 'react';
import type { PerplexitySearchNodeProps } from '.';
import type { PerplexitySearchResult } from '@/lib/clients/perplexity';

type PerplexitySearchTransformProps = PerplexitySearchNodeProps & {
  title: string;
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

export const PerplexitySearchTransform = ({ id, type, data, title }: PerplexitySearchTransformProps) => {
  const { getNodes, getEdges, updateNodeData } = useReactFlow();
  const [isLoading, setIsLoading] = useState(false);
  const [aborter, setAborter] = useState<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const updates: Record<string, unknown> = {};
    if (data.resizable !== true) updates.resizable = true;
    if (!data.width) updates.width = 440;
    if (!data.height) updates.height = 360;
    if (Object.keys(updates).length) {
      updateNodeData(id, updates);
    }
  }, [data.resizable, data.width, data.height, id, updateNodeData]);

  const execute = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const incomers = getIncomers({ id }, getNodes(), getEdges());
      const textInputs = getTextFromTextNodes(incomers);

      let query: string | string[] | undefined = undefined;
      if (textInputs.length > 1) {
        query = textInputs;
      } else if (textInputs.length === 1) {
        query = textInputs[0];
      } else if (Array.isArray(data.query) ? data.query.length : data.query) {
        query = data.query;
      } else if (data.instructions) {
        query = data.instructions;
      }

      if (!query || (Array.isArray(query) && query.length === 0)) {
        throw new Error('Connect text nodes or provide a saved query before running the search.');
      }

      const controller = new AbortController();
      setAborter(controller);

      const response = await fetch('/api/tools/perplexity/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          country: data.country ?? 'US',
          max_results: data.max_results ?? 5,
          max_tokens_per_page: data.max_tokens_per_page ?? 1024,
        }),
        signal: controller.signal,
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
        source: 'transform',
        query,
        country: data.country ?? 'US',
        max_results: data.max_results ?? 5,
        max_tokens_per_page: data.max_tokens_per_page ?? 1024,
        generated: { results: json.results },
        updatedAt: new Date().toISOString(),
      });

      toast.success('Perplexity search complete');
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
      setAborter(null);
    }
  }, [data.country, data.instructions, data.max_results, data.max_tokens_per_page, data.query, getEdges, getIncomers, getNodes, id, updateNodeData]);

  const handleStop = () => {
    aborter?.abort();
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

    if (isLoading) {
      items.push({
        tooltip: 'Stop',
        children: (
          <Button size="icon" className="rounded-full" onClick={handleStop}>
            <SquareIcon size={12} />
          </Button>
        ),
      });
    } else if (data.generated) {
      items.push({
        tooltip: 'Run again',
        children: (
          <Button size="icon" className="rounded-full" onClick={execute}>
            <RotateCcwIcon size={12} />
          </Button>
        ),
      });
    } else {
      items.push({
        tooltip: 'Run',
        children: (
          <Button size="icon" className="rounded-full" onClick={execute}>
            <PlayIcon size={12} />
          </Button>
        ),
      });
    }

    return items;
  }, [data.generated, execute, handleStop, isLoading]);

  useEffect(() => {
    if (!data.generated && !isLoading && !error) {
      // Automatically run once when switching from primitive with incomer queries
      const incomers = getIncomers({ id }, getNodes(), getEdges());
      const textInputs = getTextFromTextNodes(incomers);
      if (textInputs.length && !aborter) {
        execute();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { grouped, flat } = normalizeResults(data.generated);
  const normalizedQueries = Array.isArray(data.query)
    ? data.query
    : data.query
    ? [data.query]
    : [];

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
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between rounded-lg border bg-secondary px-3 py-2 text-xs text-muted-foreground">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium uppercase tracking-wide">Inputs</span>
                {normalizedQueries.length ? (
                  <span>
                    {normalizedQueries.length === 1
                      ? `Using query: "${normalizedQueries[0]}"`
                      : `Using ${normalizedQueries.length} queries from incomers`}
                  </span>
                ) : (
                  <span>Waiting for connected text nodes or saved query.</span>
                )}
              </div>
              <Button size="sm" onClick={execute} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Running
                  </>
                ) : (
                  <>
                    <PlayIcon size={12} className="mr-1" />
                    Run search
                  </>
                )}
              </Button>
            </div>
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
              <p className="text-sm text-muted-foreground">
                Connect text nodes to supply queries, then press Run search.
              </p>
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
    </NodeLayout>
  );
};

export default PerplexitySearchTransform;
