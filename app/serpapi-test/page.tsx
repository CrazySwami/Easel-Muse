'use client';

import { useState } from 'react';

export default function SerpApiTestPage() {
  const [q, setQ] = useState('drop shipping');
  const [location, setLocation] = useState('United States');
  const [hl, setHl] = useState('en');
  const [gl, setGl] = useState('US');
  const [googleDomain, setGoogleDomain] = useState('google.com');
  const [noCache, setNoCache] = useState(true);
  const [out, setOut] = useState<any>(null);
  const [status, setStatus] = useState<string>('');

  const runSearch = async () => {
    setStatus('searching...');
    const res = await fetch('/api/serpapi/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, location, hl, gl, no_cache: noCache, google_domain: googleDomain }) });
    const json = await res.json();
    setOut(json);
    setStatus('done');
    console.log('[TEST] search response', json);
  };

  const runAio = async () => {
    setStatus('fetching AIO...');
    const res = await fetch('/api/serpapi/ai-overview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, location, hl, gl, no_cache: noCache, google_domain: googleDomain }) });
    const json = await res.json();
    setOut(json);
    setStatus('done');
    console.log('[TEST] aio response', json);
  };

  return (
    <main className="mx-auto grid max-w-5xl gap-4 p-6">
      <h1 className="text-xl font-semibold">SerpApi AIO Tester</h1>
      <div className="grid gap-2">
        <label>Query</label>
        <input className="rounded border p-2" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label>Location</label>
          <input className="rounded border p-2" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-2">
            <label>hl</label>
            <input className="rounded border p-2" value={hl} onChange={(e) => setHl(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <label>gl</label>
            <input className="rounded border p-2" value={gl} onChange={(e) => setGl(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <label>google_domain</label>
            <input className="rounded border p-2" value={googleDomain} onChange={(e) => setGoogleDomain(e.target.value)} />
          </div>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={noCache} onChange={(e) => setNoCache(e.target.checked)} /> Force fresh (no_cache)
      </label>
      <div className="flex gap-2">
        <button className="rounded bg-black px-3 py-2 text-white" onClick={runSearch}>Run Search</button>
        <button className="rounded bg-emerald-600 px-3 py-2 text-white" onClick={runAio}>Run AI Overview</button>
        <span className="text-sm text-muted-foreground">{status}</span>
      </div>
      <div className="grid gap-2">
        <label className="font-medium">Output</label>
        <pre className="max-h-[60vh] overflow-auto rounded bg-gray-950 p-3 text-gray-100 text-xs">{out ? JSON.stringify(out, null, 2) : '// run a test'}</pre>
      </div>
    </main>
  );
}



