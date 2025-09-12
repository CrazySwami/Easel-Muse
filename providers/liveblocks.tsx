'use client';

import { RoomProvider, ClientSideSuspense, useMyPresence, useOthers, useSelf, useRoom } from '@liveblocks/react';
import { useReactFlow } from '@xyflow/react';
import type { PropsWithChildren } from 'react';
import { useEffect, useMemo, useState } from 'react';

type LiveblocksRoomProviderProps = PropsWithChildren & {
  projectId: string;
};

export const LiveblocksRoomProvider = ({ children, projectId }: LiveblocksRoomProviderProps) => {
  if (!projectId) {
    return <div>Loading...</div>;
  }

  return (
    <RoomProvider 
      id={projectId} 
      initialPresence={{ cursor: null }}
    >
      <ClientSideSuspense fallback={<div>Loading room...</div>}>
        {children}
      </ClientSideSuspense>
    </RoomProvider>
  );
};

export const CursorsLayer = () => {
  const [, setMyPresence] = useMyPresence();
  const others = useOthers();

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMyPresence({ cursor: { x: e.clientX, y: e.clientY } });
    };
    const onLeave = () => setMyPresence({ cursor: null });

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, [setMyPresence]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {others
        .filter((u) => u.presence?.cursor)
        .map((user) => {
          const cursor = user.presence?.cursor as { x: number; y: number } | undefined;
          if (!cursor) return null;
          
          return (
            <div
              key={user.connectionId}
              style={{
                position: 'fixed',
                left: cursor.x,
                top: cursor.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 9999,
                  background: '#06f',
                  boxShadow: '0 0 0 2px white',
                }}
              />
            </div>
          );
        })}
    </div>
  );
};

// Compact avatar stack (up to 5)
export const AvatarStack = () => {
  const me = useSelf();
  const others = useOthers();

  const users = useMemo(() => {
    const base = others.map((u) => ({
      id: u.connectionId,
      name: (u.info as any)?.name ?? (u.info as any)?.email ?? 'User',
      avatar: (u.info as any)?.avatar as string | undefined,
      color: (u.info as any)?.color ?? '#06f',
    }));
    if (me) {
      base.unshift({
        id: me.connectionId,
        name: (me.info as any)?.name ?? 'You',
        avatar: (me.info as any)?.avatar as string | undefined,
        color: (me.info as any)?.color ?? '#06f',
      });
    }
    return base;
  }, [me, others]);

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {users.slice(0, 5).map((u) => (
          <div key={u.id} className="inline-block h-6 w-6 rounded-full ring-1 ring-white" title={u.name} style={{ background: u.avatar ? undefined : u.color }}>
            {u.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.avatar} alt={u.name} className="h-6 w-6 rounded-full object-cover" />
            ) : null}
          </div>
        ))}
      </div>
      {users.length > 5 ? (
        <span className="ml-2 text-xs text-muted-foreground">+{users.length - 5}</span>
      ) : null}
    </div>
  );
};

// Simple connection status pill
export const RoomStatus = () => {
  const room = useRoom();
  const [status, setStatus] = useState<string>(room.getStatus?.() ?? 'unknown');
  useEffect(() => {
    const update = () => setStatus(room.getStatus?.() ?? 'unknown');
    // Subscribe to status changes (fallback to interval if events are unavailable)
    const ev: any = (room as any).events;
    ev?.on?.('status', update);
    const iv = setInterval(update, 1000);
    return () => {
      ev?.off?.('status', update);
      clearInterval(iv);
    };
  }, [room]);
  const color = status === 'connected' ? '#22c55e' : status === 'connecting' ? '#eab308' : status === 'reconnecting' ? '#f97316' : '#ef4444';
  return (
    <div className="flex items-center gap-1 rounded-full border bg-card/90 px-2 py-1 text-xs drop-shadow-xs backdrop-blur-sm">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="capitalize">{String(status)}</span>
    </div>
  );
};

// Notice when over cap (5)
export const RoomCapNotice = () => {
  const me = useSelf();
  const others = useOthers();
  const count = (me ? 1 : 0) + others.length;
  if (count <= 5) return null as any;
  return (
    <div className="rounded-full border bg-card/90 px-2 py-1 text-xs text-muted-foreground drop-shadow-xs backdrop-blur-sm" title="Room cap is 5 for now">
      Room full (5)
    </div>
  );
};

// Debug panel (toggle via ?debug=1 or localStorage.lbDebug='1')
export const DebugPanel = ({ projectId }: { projectId: string }) => {
  const room = useRoom();
  const me = useSelf();
  const others = useOthers();
  const rf = useReactFlow();
  const [fps, setFps] = useState<number | null>(null);
  const [heapMb, setHeapMb] = useState<number | null>(null);
  const [authMs, setAuthMs] = useState<number | null>(null);
  const [resetting, setResetting] = useState<boolean>(false);
  const [yjsOptIn, setYjsOptIn] = useState<boolean>(false);
  const [reachability, setReachability] = useState<'unknown'|'ok'|'blocked'>('unknown');
  const [lastNote, setLastNote] = useState<string | null>(null);
  const [serverGate, setServerGate] = useState<'unknown'|'allowed'|'blocked'>('unknown');
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [events, setEvents] = useState<Array<{ ts: string; type: string; data?: unknown }>>([]);

  // gate
  const show = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const q = new URLSearchParams(window.location.search).get('debug');
    if (localStorage.getItem('lbDebug') === '1') return true;
    if (!q) return false;
    const s = String(q).toLowerCase();
    return !(s === '' || s === '0' || s === 'false');
  }, []);
  if (!show) return null as any;

  useEffect(() => {
    // FPS sampler
    let frame = 0;
    let last = performance.now();
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(frame);
        frame = 0;
        last = now;
      } else {
        frame++;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    // Heap snapshot (Chrome)
    const m: any = (performance as any).memory;
    if (m) setHeapMb(Math.round(m.usedJSHeapSize / 1e6));
  }, []);

  useEffect(() => {
    // Quick auth latency probe
    (async () => {
      try {
        const t0 = performance.now();
        const res = await fetch('/api/liveblocks-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: projectId }) });
        if (res.ok) setAuthMs(Math.round(performance.now() - t0));
      } catch {}
    })();
  }, [projectId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setYjsOptIn(localStorage.getItem('yjs') === 'on');
  }, []);

  const reconnect = () => {
    try {
      (room as any).leave?.();
      setTimeout(() => (room as any).enter?.(), 150);
      setEvents((e) => [...e, { ts: new Date().toISOString(), type: 'reconnect' }].slice(-200));
    } catch {}
  };

  const resetDoc = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await fetch('/api/liveblocks/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: projectId }) });
      reconnect();
      setEvents((e) => [...e, { ts: new Date().toISOString(), type: 'reset', data: 'ok' }].slice(-200));
    } finally {
      setResetting(false);
    }
  };

  // Rough graph size estimate to spot large canvases
  const graphSizeKb = useMemo(() => {
    try {
      const obj = rf.toObject?.();
      if (!obj) return null;
      const bytes = new TextEncoder().encode(JSON.stringify({ nodes: obj.nodes, edges: obj.edges })).length;
      return Math.round(bytes / 1000);
    } catch { return null; }
  }, [rf]);

  const status = room.getStatus?.() ?? 'unknown';
  const yjsAllowed = typeof graphSizeKb === 'number' ? graphSizeKb <= 400 : false;
  // Auto-fallback: if reconnecting too long, flip Yjs off and prompt user
  useEffect(() => {
    const ev: any = (room as any).events;
    const onStatus = () => setEvents((e) => [...e, { ts: new Date().toISOString(), type: 'status', data: room.getStatus?.() }].slice(-200));
    ev?.on?.('status', onStatus);
    const onLost = () => {
      try {
        if (typeof window === 'undefined') return;
        if (localStorage.getItem('yjs') === 'on') {
          localStorage.removeItem('yjs');
          // eslint-disable-next-line no-alert
          const msg = 'Liveblocks: long reconnect — disabling Yjs (presence-only)';
          console.warn(msg);
          setLastNote(msg);
          setEvents((e) => [...e, { ts: new Date().toISOString(), type: 'auto-fallback', data: msg }].slice(-200));
        }
      } catch {}
    };
    ev?.on?.('lost-connection', onLost);
    return () => { ev?.off?.('lost-connection', onLost); ev?.off?.('status', onStatus); };
  }, [room]);

  // Reachability test (HTTP probe, coarse)
  const testReachability = async () => {
    try {
      await fetch('https://api.liveblocks.io/v7', { mode: 'no-cors' });
      setReachability('ok');
      setEvents((e) => [...e, { ts: new Date().toISOString(), type: 'ws-probe', data: 'ok' }].slice(-200));
    } catch {
      setReachability('blocked');
      setEvents((e) => [...e, { ts: new Date().toISOString(), type: 'ws-probe', data: 'blocked' }].slice(-200));
    }
  };
  useEffect(() => { testReachability(); }, []);

  // Server size gate probe
  const probeServerGate = async () => {
    try {
      const res = await fetch('/api/liveblocks/ydoc-size', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: projectId }) });
      if (!res.ok) { setServerGate('unknown'); return; }
      const json = await res.json();
      setServerGate(json.allowed ? 'allowed' : 'blocked');
      setEvents((e) => [...e, { ts: new Date().toISOString(), type: 'gate', data: json }].slice(-200));
      if (!json.allowed && localStorage.getItem('yjs') === 'on') {
        localStorage.removeItem('yjs');
        setLastNote('Server gate: Yjs blocked due to large doc; presence-only');
      }
    } catch { setServerGate('unknown'); }
  };
  useEffect(() => { probeServerGate(); }, [projectId]);

  const dot = (color: string, title?: string) => (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: color }}
      title={title}
    />
  );

  return (
    <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 60 }} className="rounded-md border bg-card/95 px-3 py-2 text-xs drop-shadow-xs backdrop-blur-sm">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1">
          {dot(status === 'connected' ? '#22c55e' : status === 'connecting' ? '#eab308' : status === 'reconnecting' ? '#f97316' : '#ef4444', 'Room status')}
          <strong>Status:</strong> {String(status)}
        </span>
        <span><strong>Users:</strong> {(me ? 1 : 0) + others.length}</span>
        {typeof fps === 'number' ? <span><strong>FPS:</strong> {fps}</span> : null}
        {typeof heapMb === 'number' ? <span><strong>Heap:</strong> {heapMb}MB</span> : null}
        {typeof authMs === 'number' ? <span><strong>Auth:</strong> {authMs}ms</span> : null}
        {typeof graphSizeKb === 'number' ? (
          <span className="flex items-center gap-1">
            {dot(graphSizeKb <= 300 ? '#22c55e' : graphSizeKb <= 400 ? '#eab308' : '#ef4444', 'Graph size')}
            <strong>Graph:</strong> {graphSizeKb}KB
          </span>
        ) : null}
        <span className="flex items-center gap-1">
          {dot(serverGate === 'allowed' ? '#22c55e' : serverGate === 'blocked' ? '#ef4444' : '#9ca3af', 'Server Yjs gate')}
          <strong>Gate:</strong> {serverGate}
        </span>
        <button type="button" onClick={probeServerGate} className="rounded border px-2 py-0.5">Gate probe</button>
        <span className="flex items-center gap-1">
          {dot(reachability === 'ok' ? '#22c55e' : reachability === 'blocked' ? '#ef4444' : '#9ca3af', 'WS reachability (coarse)')}
          <strong>WS:</strong> {reachability}
        </span>
        <button type="button" onClick={testReachability} className="rounded border px-2 py-0.5">Probe</button>
        <button type="button" onClick={reconnect} className="rounded border px-2 py-0.5">Reconnect</button>
        <button type="button" disabled={resetting} onClick={resetDoc} className="rounded border px-2 py-0.5">{resetting ? 'Resetting…' : 'Reset doc'}</button>
        {/* Toggles */}
        <span className="mx-1 opacity-50">|</span>
        <span className="flex items-center gap-1">
          {dot(yjsOptIn && yjsAllowed ? '#22c55e' : yjsOptIn && !yjsAllowed ? '#ef4444' : '#9ca3af', 'Yjs state')}
          <strong>Yjs:</strong> {yjsOptIn ? (yjsAllowed ? 'on' : 'blocked (>400KB)') : 'off'}
        </span>
        <button
          type="button"
          onClick={() => {
            if (typeof window === 'undefined') return;
            if (yjsOptIn) localStorage.removeItem('yjs'); else localStorage.setItem('yjs','on');
            location.reload();
          }}
          className="rounded border px-2 py-0.5"
        >{yjsOptIn ? 'Disable Yjs' : 'Enable Yjs'}</button>
        <button
          type="button"
          onClick={() => {
            if (typeof window === 'undefined') return;
            const v = localStorage.getItem('lbDebug') === '1' ? '0' : '1';
            localStorage.setItem('lbDebug', v);
            location.reload();
          }}
          className="rounded border px-2 py-0.5"
        >Toggle Debug</button>
        <button
          type="button"
          onClick={() => {
            if (typeof window === 'undefined') return;
            const v = localStorage.getItem('lbGate') === '1' ? '0' : '1';
            localStorage.setItem('lbGate', v);
            location.reload();
          }}
          className="rounded border px-2 py-0.5"
        >Toggle Gate</button>
        {lastNote ? <span className="text-muted-foreground">{lastNote}</span> : null}
        <span className="mx-1 opacity-50">|</span>
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="rounded border px-2 py-0.5"
        >{detailsOpen ? 'Hide details' : 'Show details'}</button>
        <button
          type="button"
          onClick={() => {
            const payload = {
              ts: new Date().toISOString(),
              projectId,
              status,
              users: (me ? 1 : 0) + others.length,
              fps,
              heapMb,
              authMs,
              graphSizeKb: typeof graphSizeKb === 'number' ? graphSizeKb : null,
              ws: reachability,
              gate: serverGate,
              yjs: { optIn: yjsOptIn, allowed: yjsAllowed },
              note: lastNote,
              location: typeof window !== 'undefined' ? window.location.href : undefined,
              events,
            };
            navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
          }}
          className="rounded border px-2 py-0.5"
        >Copy</button>
      </div>
      {detailsOpen ? (
        <pre
          style={{ marginTop: 6, maxHeight: 180, overflow: 'auto' }}
          className="whitespace-pre-wrap"
        >{JSON.stringify({
            ts: new Date().toISOString(),
            projectId,
            status,
            users: (me ? 1 : 0) + others.length,
            fps,
            heapMb,
            authMs,
            graphSizeKb: typeof graphSizeKb === 'number' ? graphSizeKb : null,
            ws: reachability,
            gate: serverGate,
            yjs: { optIn: yjsOptIn, allowed: yjsAllowed },
            note: lastNote,
            events,
          }, null, 2)}</pre>
      ) : null}
    </div>
  );
};

