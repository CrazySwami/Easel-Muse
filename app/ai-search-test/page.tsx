'use client';

import { useState } from 'react';

export default function AISearchTestPage() {
  const [q, setQ] = useState('What is quantum computing? Cite sources.');
  const [urlContext, setUrlContext] = useState('');
  const [out, setOut] = useState<any>(null);
  const [status, setStatus] = useState('');

  const runGemini = async () => {
    setStatus('running…');
    const urls = urlContext.split('\n').map(s => s.trim()).filter(Boolean);
    const res = await fetch('/api/gemini/search', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, urlContext: urls, dynamic: true })
    });
    const json = await res.json();
    setOut(json); setStatus('done');
    console.log('[AI-TEST] gemini result', json);
  };

  return (
    <main className="mx-auto grid max-w-5xl gap-4 p-6">
      <h1 className="text-xl font-semibold">AI Search Test (Gemini 2.5 Flash)</h1>
      <div className="grid gap-2">
        <label>Query</label>
        <input className="rounded border p-2" value={q} onChange={(e)=> setQ(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <label>Optional URL Context (one per line)</label>
        <textarea className="rounded border p-2" rows={4} value={urlContext} onChange={(e)=> setUrlContext(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded bg-emerald-600 px-3 py-2 text-white" onClick={runGemini}>Run Gemini Search</button>
        <span className="text-sm text-muted-foreground">{status}</span>
      </div>
      <div className="grid gap-2">
        <label className="font-medium">Output</label>
        <pre className="max-h-[60vh] overflow-auto rounded bg-gray-950 p-3 text-gray-100 text-xs">{out ? JSON.stringify(out, null, 2) : '// run a test'}</pre>
      </div>
    </main>
  );
}


