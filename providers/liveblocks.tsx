'use client';

import { RoomProvider, ClientSideSuspense, useMyPresence, useOthers, useSelf, useRoom } from '@liveblocks/react';
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

