'use client';

import {
  RoomProvider,
  ClientSideSuspense,
  useMyPresence,
  useOthers,
  useSelf,
  useRoom,
} from '@liveblocks/react';
import { useEffect, useMemo, useState, useRef, createContext, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useReactFlow, useStore } from '@xyflow/react';
import type { PropsWithChildren } from 'react';
import * as Y from 'yjs';
import { LiveblocksYjsProvider as LiveblocksYjsProvider_ } from '@liveblocks/yjs';

type LiveblocksYjsProviderProps = PropsWithChildren & {
  projectId: string;
};

// Yjs document context
const YjsContext = createContext<{
  doc: Y.Doc;
  provider: LiveblocksYjsProvider_ | null;
} | null>(null);

export const LiveblocksYjsProvider = ({
  children,
  projectId,
}: LiveblocksYjsProviderProps) => {
  const room = useRoom();
  const [doc] = useState(() => new Y.Doc());
  const [provider, setProvider] =
    useState<LiveblocksYjsProvider_ | null>(null);

  useEffect(() => {
    const p = new LiveblocksYjsProvider_(room as any, doc);
    setProvider(p);
    return () => {
      p.destroy();
    };
  }, [room, doc]);

  return (
    <YjsContext.Provider value={{ doc, provider }}>
      {children}
    </YjsContext.Provider>
  );
};

export const useYDoc = () => {
    const context = useContext(YjsContext);
    if (!context) {
      throw new Error('useYDoc must be used within a LiveblocksYjsProvider');
    }
    return context;
}

type LiveblocksRoomProviderProps = PropsWithChildren & {
  projectId: string;
};

export const LiveblocksRoomProvider = ({
  children,
  projectId,
}: LiveblocksRoomProviderProps) => {
  if (!projectId) {
    return <div>Loading...</div>;
  }

  return (
    <RoomProvider id={projectId} initialPresence={{ cursor: null }}>
      <ClientSideSuspense fallback={<div>Loading room...</div>}>
        <LiveblocksYjsProvider projectId={projectId}>
            {children}
        </LiveblocksYjsProvider>
      </ClientSideSuspense>
    </RoomProvider>
  );
};

export const CursorsLayer = () => {
  const [, setMyPresence] = useMyPresence();
  const me = useSelf();
  const others = useOthers();
  const { screenToFlowPosition } = useReactFlow();
  const transform = useStore((s) => s.transform); // [tx, ty, zoom]
  const paneRect = useStore((s) => s.domNode?.getBoundingClientRect());

  useEffect(() => {
    // Publish presence at ~30–40ms, render locally per frame
    let raf = 0;
    let tick = 0;
    const lastEventRef: { current: MouseEvent | null } = { current: null };
    const loop = () => {
      const e = lastEventRef.current;
      if (e) {
        if (++tick % 2 === 0) {
          const flow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
          setMyPresence({ cursor: { x: flow.x, y: flow.y } });
          tick = 0;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: MouseEvent) => {
      lastEventRef.current = e;
    };
    const onLeave = () => setMyPresence({ cursor: null });

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [setMyPresence]);

  const renderCursor = (flowX: number, flowY: number, color: string, label?: string, key?: string | number) => {
    const [tx, ty, zoom] = transform ?? [0, 0, 1];
    const x = (flowX * zoom + tx) + (paneRect?.left ?? 0);
    const y = (flowY * zoom + ty) + (paneRect?.top ?? 0);
    return (
    <div
      key={key}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        transform: 'translate(-2px, -2px)',
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      {label ? (
        <div
          style={{
            position: 'absolute',
            left: 14,
            top: 12,
            padding: '2px 6px',
            borderRadius: 6,
            background: color,
            color: 'white',
            fontSize: 10,
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 2px rgba(0,0,0,.35)'
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  ); };

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {others
        .filter((u) => u.presence?.cursor)
        .map((user) => {
          const cursor = user.presence?.cursor as { x: number; y: number } | undefined;
          if (!cursor) return null;
          const color = (user.info as any)?.color ?? '#06f';
          const name = (user.info as any)?.name ?? 'User';
          return renderCursor(cursor.x, cursor.y, color, name, user.connectionId);
        })}
      {me?.presence?.cursor
        ? renderCursor(
            (me.presence.cursor as any).x,
            (me.presence.cursor as any).y,
            ((me.info as any)?.color as string) ?? '#06f',
            ((me.info as any)?.name as string) ?? 'You'
          )
        : null}
    </div>
  );
};

export const AvatarStack = () => {
  const me = useSelf();
  const others = useOthers();
  // Deduplicate by userId (fallback to email/name) to avoid double avatars when
  // Strict Mode or multiple connections for the same user are present.
  const dedupedOthers = (() => {
    const map = new Map<string, typeof others[number]>();
    for (const u of others) {
      const info = (u.info as any) ?? {};
      const key = (u as any).userId || info.email || info.name || String(u.connectionId);
      if (!map.has(key)) map.set(key, u);
    }
    // Exclude entries that match the current user's userId (or email/name) in case
    // another connection from the same account is counted as an "other".
    const meInfo = (me?.info as any) ?? {};
    const meKey = (me as any)?.userId || meInfo.email || meInfo.name;
    return Array.from(map.values()).filter((u) => {
      const info = (u.info as any) ?? {};
      const key = (u as any).userId || info.email || info.name;
      return !meKey || key !== meKey;
    });
  })();

  const users = [
    ...(me
      ? [{ id: me.connectionId, name: (me.info as any)?.name ?? 'You', avatar: (me.info as any)?.avatar as string | undefined, color: (me.info as any)?.color ?? '#06f' }]
      : []),
    ...dedupedOthers.map((u) => ({ id: u.connectionId, name: (u.info as any)?.name ?? 'User', avatar: (u.info as any)?.avatar as string | undefined, color: (u.info as any)?.color ?? '#06f' })),
  ];
  return (
    <div className="flex -space-x-2">
      {users.slice(0, 5).map((u) => (
        <div key={u.id} className="inline-block h-6 w-6 rounded-full ring-1 ring-white" title={u.name} style={{ background: u.avatar ? undefined : u.color }}>
          {u.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u.avatar} alt={u.name} className="h-6 w-6 rounded-full object-cover" />
          ) : null}
        </div>
      ))}
      {users.length > 5 ? (
        <span className="ml-2 text-xs text-muted-foreground">+{users.length - 5}</span>
      ) : null}
    </div>
  );
};

export const RoomStatus = ({ inline = false }: { inline?: boolean }) => {
  const room = useRoom();
  const [status, setStatus] = useState<string>(room.getStatus?.() ?? 'unknown');
  useEffect(() => {
    const update = () => setStatus(room.getStatus?.() ?? 'unknown');
    const ev: any = (room as any).events;
    ev?.on?.('status', update);
    const iv = setInterval(update, 1000);
    return () => { ev?.off?.('status', update); clearInterval(iv); };
  }, [room]);
  const color = status === 'connected' ? '#22c55e' : status === 'connecting' ? '#eab308' : status === 'reconnecting' ? '#f97316' : '#ef4444';
  return (
    <div className={inline ? 'flex items-center gap-2 text-xs' : 'flex items-center gap-1 rounded-full border bg-card/90 px-2 py-1 text-xs drop-shadow-xs backdrop-blur-sm'}>
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="capitalize">{String(status)}</span>
    </div>
  );
};

// Minimal stub to avoid undefined import at runtime; expand later if needed
export const RoomDebugPanel = ({ projectId }: { projectId: string }) => {
  return null as any;
};


