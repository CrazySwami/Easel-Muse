import { z } from 'zod';

export const PerplexitySearchRequestSchema = z.object({
  query: z.union([z.string().min(1), z.array(z.string().min(1))]),
  max_results: z.number().int().min(1).max(20).optional(),
  max_tokens_per_page: z.number().int().min(64).max(4096).optional(),
  country: z.string().length(2).optional(),
});

export type PerplexitySearchRequest = z.infer<typeof PerplexitySearchRequestSchema>;

export type PerplexitySearchResult = {
  title: string;
  url: string;
  snippet?: string;
  date?: string;
  last_updated?: string;
};

export type PerplexitySearchResponse =
  | { results: PerplexitySearchResult[] }
  | { results: PerplexitySearchResult[][] };

const ENDPOINT = 'https://api.perplexity.ai/search';

export async function perplexitySearch(
  body: PerplexitySearchRequest,
  init?: { signal?: AbortSignal }
): Promise<PerplexitySearchResponse> {
  const parsed = PerplexitySearchRequestSchema.parse(body);
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('Missing PERPLEXITY_API_KEY');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(parsed),
    signal: init?.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Perplexity Search error ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as PerplexitySearchResponse;
}
