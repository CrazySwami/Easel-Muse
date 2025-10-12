'use client';

import { useMemo, useState } from 'react';
import { SearchResult } from '@/components/nodes/perplexity/search-result';
import { AnthropicIcon, OpenAiIcon, GeminiIcon, GoogleIcon } from '@/lib/icons';
import { CheckIcon } from 'lucide-react';

const root = (u: string) => {
  try { return new URL(u).hostname.replace(/^www\./,''); } catch { return ''; }
};

export default function AICompareTestPage() {
  const [q, setQ] = useState('What is quantum computing? Cite sources.');
  const [out, setOut] = useState<any>({ openai: null, gemini: null, anthropic: null, serp: null });
  const [status, setStatus] = useState('');

  const runAll = async () => {
    setStatus('running…');
    const [o, g, a, s] = await Promise.allSettled([
      fetch('/api/openai/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q }) }).then(r=>r.json()),
      fetch('/api/gemini/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q }) }).then(r=>r.json()),
      fetch('/api/anthropic/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q }) }).then(r=>r.json()),
      fetch('/api/serpapi/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, hl: 'en', gl: 'US' }) }).then(r=>r.json()),
    ]);
    setOut({
      openai: o.status==='fulfilled'?o.value:null,
      gemini: g.status==='fulfilled'?g.value:null,
      anthropic: a.status==='fulfilled'?a.value:null,
      serp: s.status==='fulfilled'?s.value:null,
    });
    setStatus('done');
  };

  const domains = useMemo(() => {
    const counts = new Map<string, number>();
    const add = (u?: string) => { if (!u) return; const d = root(u); if (!d) return; counts.set(d, (counts.get(d)||0)+1); };
    // OpenAI: try to extract links from citations in output (tool result varies)
    try {
      const output = out.openai?.output?.[0]?.content?.[0]?.text as string | undefined;
      if (output) {
        [...output.matchAll(/https?:\/\/\S+/g)].forEach(m => add(m[0]));
      }
    } catch {}
    // Gemini: scan for links
    try {
      const text = JSON.stringify(out.gemini ?? {});
      [...text.matchAll(/https?:\/\/\S+/g)].forEach(m => add(m[0]));
    } catch {}
    // Anthropic: scan for links
    try {
      const text = JSON.stringify(out.anthropic ?? {});
      [...text.matchAll(/https?:\/\/\S+/g)].forEach(m => add(m[0]));
    } catch {}
    // SerpApi: organic_results
    try {
      const organic: any[] = Array.isArray(out.serp?.organic_results) ? out.serp.organic_results : [];
      organic.forEach(r => add(r?.link));
    } catch {}
    return Array.from(counts.entries()).sort((a,b)=> b[1]-a[1]);
  }, [out]);

  const urls = useMemo(() => {
    const unique = new Set<string>();
    const push = (u?: string) => { if (!u) return; try { const href = new URL(u).href; unique.add(href); } catch {} };
    try { const text = JSON.stringify(out.openai ?? {}); [...text.matchAll(/https?:\/\/[^\s\)"']+/g)].forEach(m => push(m[0])); } catch {}
    try {
      const refs: any[] = out.gemini?.candidates?.[0]?.groundingMetadata?.references ?? [];
      refs.forEach(r => push(r?.link));
      const text = JSON.stringify(out.gemini ?? {});
      [...text.matchAll(/https?:\/\/[^\s\)"']+/g)].forEach(m => push(m[0]));
    } catch {}
    try { const text = JSON.stringify(out.anthropic ?? {}); [...text.matchAll(/https?:\/\/[^\s\)"']+/g)].forEach(m => push(m[0])); } catch {}
    try {
      const organic: any[] = Array.isArray(out.serp?.organic_results) ? out.serp.organic_results : [];
      organic.forEach(r => push(r?.link));
      const aioRefs: any[] = out.serp?.ai_overview?.references ?? [];
      aioRefs.forEach(r => push(r?.link));
    } catch {}
    return Array.from(unique.values()).sort((a,b) => root(a).localeCompare(root(b)) || a.localeCompare(b));
  }, [out]);

  const coverage = useMemo(() => {
    const tOpenAI = JSON.stringify(out.openai ?? {});
    const tGemini = JSON.stringify(out.gemini ?? {});
    const tAnthropic = JSON.stringify(out.anthropic ?? {});
    const tSerp = JSON.stringify(out.serp ?? {});

    // Aggregate by domain (collapse multiple URLs from the same site)
    const map = new Map<string, { domain: string; url: string; openai: boolean; gemini: boolean; anthropic: boolean; serp: boolean; total: number }>();

    for (const u of urls) {
      const domain = root(u) || u;
      const openai = tOpenAI.includes(u);
      const gemini = tGemini.includes(u);
      const anthropic = tAnthropic.includes(u);
      const serp = tSerp.includes(u);
      const existing = map.get(domain);
      if (existing) {
        existing.openai = existing.openai || openai;
        existing.gemini = existing.gemini || gemini;
        existing.anthropic = existing.anthropic || anthropic;
        existing.serp = existing.serp || serp;
        // keep the first representative URL
      } else {
        map.set(domain, { domain, url: u, openai, gemini, anthropic, serp, total: 0 });
      }
    }

    const rows = Array.from(map.values()).map((r) => ({
      ...r,
      total: [r.openai, r.gemini, r.anthropic, r.serp].filter(Boolean).length,
    }));
    rows.sort((a, b) => b.total - a.total || a.domain.localeCompare(b.domain));
    return rows;
  }, [urls, out]);

  // Optionally resolve Vertex redirectors before render of pills/table
  // For simplicity in this test page, do a best-effort pass when status becomes 'done'
  // (Avoids modifying upstream extraction logic.)
  const [resolved, setResolved] = useState<Map<string, string> | null>(null);
  useMemo(() => {
    const doResolve = async () => {
      const entries = await Promise.all(
        urls.map(async (u) => {
          try {
            const host = new URL(u).hostname;
            if (!host.endsWith('vertexaisearch.cloud.google.com')) return [u, u] as const;
            const r = await fetch(`/api/resolve?url=${encodeURIComponent(u)}`).then((r) => r.json());
            return [u, r.finalUrl || u] as const;
          } catch {
            return [u, u] as const;
          }
        })
      );
      setResolved(new Map(entries));
    };
    if (status === 'done' && urls.length) doResolve();
  }, [status, urls]);

  // Gemini grounding-aware citations (use title/domain + redirector href)
  const geminiCitations = useMemo(() => {
    try {
      const chunks: any[] = out.gemini?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      return chunks
        .map((c: any) => c?.web)
        .filter(Boolean)
        .map((w: any) => ({
          title: w?.title || w?.domain || 'Source',
          href: w?.uri,
        }))
        .filter((x: any) => !!x.href);
    } catch {
      return [] as Array<{ title: string; href: string }>;
    }
  }, [out.gemini]);

  return (
    <main className="mx-auto grid max-w-5xl gap-4 p-6">
      <h1 className="text-xl font-semibold">AI Search Compare (OpenAI / Gemini 2.5 Flash / Claude / SerpApi)</h1>
      <div className="grid gap-2">
        <label>Query</label>
        <input className="rounded border p-2" value={q} onChange={(e)=> setQ(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded bg-emerald-600 px-3 py-2 text-white" onClick={runAll}>Run All</button>
        <span className="text-sm text-muted-foreground">{status}</span>
      </div>

      <section className="grid md:grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold">OpenAI (web_search_preview)</h2>
          <pre className="max-h-[40vh] overflow-auto rounded bg-gray-950 p-3 text-gray-100 text-xs">{out.openai ? JSON.stringify(out.openai, null, 2) : '// run'}</pre>
        </div>
        <div>
          <h2 className="font-semibold">Gemini 2.5 Flash (Search)</h2>
          <pre className="max-h-[40vh] overflow-auto rounded bg-gray-950 p-3 text-gray-100 text-xs">{out.gemini ? JSON.stringify(out.gemini, null, 2) : '// run'}</pre>
        </div>
        <div>
          <h2 className="font-semibold">Claude (Web Search)</h2>
          <pre className="max-h-[40vh] overflow-auto rounded bg-gray-950 p-3 text-gray-100 text-xs">{out.anthropic ? JSON.stringify(out.anthropic, null, 2) : '// run'}</pre>
        </div>
        <div>
          <h2 className="font-semibold">SerpApi (Organic)</h2>
          <pre className="max-h-[40vh] overflow-auto rounded bg-gray-950 p-3 text-gray-100 text-xs">{out.serp ? JSON.stringify(out.serp, null, 2) : '// run'}</pre>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="font-semibold">Citations</h2>
        {geminiCitations.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {geminiCitations.map((c) => (
              <SearchResult key={c.href} result={{ url: c.href, title: c.title, snippet: '' }} />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {urls.map((u) => {
              const finalUrl = resolved?.get(u) ?? u;
              const display = root(finalUrl) || root(u) || finalUrl;
              return (
                <SearchResult key={u} result={{ url: finalUrl, title: display, snippet: '' }} />
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-2">
        <h2 className="font-semibold">Coverage by tool</h2>
        <div className="overflow-auto rounded border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="border-b p-2">Domain</th>
                <th className="border-b p-2"><span className="inline-flex items-center gap-1"><OpenAiIcon className="h-4 w-4" /> ChatGPT</span></th>
                <th className="border-b p-2"><span className="inline-flex items-center gap-1"><GeminiIcon className="h-4 w-4" /> Gemini</span></th>
                <th className="border-b p-2"><span className="inline-flex items-center gap-1"><AnthropicIcon className="h-4 w-4" /> Claude</span></th>
                <th className="border-b p-2"><span className="inline-flex items-center gap-1"><GoogleIcon className="h-4 w-4" /> SerpApi</span></th>
                <th className="border-b p-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((row) => {
                const finalUrl = resolved?.get(row.url) ?? row.url;
                const domain = row.domain;
                return (
                <tr key={row.domain}>
                  <td className="border-b p-2">
                    <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline">
                      <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`} width={14} height={14} className="rounded" alt="favicon" />
                      {domain}
                    </a>
                  </td>
                  <td className="border-b p-2">{row.openai && <CheckIcon className="h-4 w-4 text-emerald-600" />}</td>
                  <td className="border-b p-2">{row.gemini && <CheckIcon className="h-4 w-4 text-emerald-600" />}</td>
                  <td className="border-b p-2">{row.anthropic && <CheckIcon className="h-4 w-4 text-emerald-600" />}</td>
                  <td className="border-b p-2">{row.serp && <CheckIcon className="h-4 w-4 text-emerald-600" />}</td>
                  <td className="border-b p-2">{row.total}</td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}


