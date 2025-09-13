'use client';

import { RoomProvider, ClientSideSuspense, useMyPresence, useOthers, useSelf, useRoom } from '@liveblocks/react';
import { useReactFlow, useStore } from '@xyflow/react';
import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';

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
  const me = useSelf();
  const others = useOthers();
  const { screenToFlowPosition } = useReactFlow();
  const transform = useStore((s) => s.transform); // [tx, ty, zoom]
  const paneRect = useStore((s) => s.domNode?.getBoundingClientRect());

  useEffect(() => {
    let raf = 0;
    let lastEvent: MouseEvent | null = null;
    const loop = () => {
      if (lastEvent) {
        const flow = screenToFlowPosition({ x: lastEvent.clientX, y: lastEvent.clientY });
        setMyPresence({ cursor: { x: flow.x, y: flow.y } });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: MouseEvent) => {
      lastEvent = e;
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

  // Debug logging
  useEffect(() => {
    console.log('Liveblocks cursors - Others count:', others.length);
    others.forEach((user, index) => {
      console.log(`User ${index}:`, {
        connectionId: user.connectionId,
        presence: user.presence,
        cursor: user.presence?.cursor
      });
    });
  }, [others]);

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
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 9999,
          background: color,
          boxShadow: '0 0 0 2px white',
        }}
      />
      {label ? (
        <div
          style={{
            marginTop: 6,
            padding: '2px 6px',
            borderRadius: 6,
            background: color,
            color: 'white',
            fontSize: 10,
            whiteSpace: 'nowrap',
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
            'You'
          )
        : null}
    </div>
  );
};

export const RoomAvatars = () => {
  const others = useOthers();
  const me = useSelf();
  const users = [
    ...(me
      ? [
          {
            id: me.connectionId,
            name: (me.info as any)?.name ?? 'You',
            email: (me.info as any)?.email as string | undefined,
            avatar: (me.info as any)?.avatar as string | undefined,
            color: (me.info as any)?.color ?? '#06f',
          },
        ]
      : []),
    ...others.map((u) => ({
      id: u.connectionId,
      name: (u.info as any)?.name ?? (u.info as any)?.email ?? 'User',
      email: (u.info as any)?.email as string | undefined,
      avatar: (u.info as any)?.avatar as string | undefined,
      color: (u.info as any)?.color ?? '#06f',
    })),
  ];

  const [open, setOpen] = useState<boolean>(false);
  const [hoverId, setHoverId] = useState<number | null>(null);

  return (
    <div
      style={{ position: 'absolute', right: 12, bottom: 84, zIndex: 60 }}
      className="flex flex-col items-end gap-2"
    >
      {open && (
        <div className="rounded-md border bg-card/95 p-2 backdrop-blur-sm shadow-md">
          <div className="flex flex-col gap-1 max-h-56 overflow-auto">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-2">
                {u.avatar ? (
                  <img
                    src={u.avatar}
                    alt={u.name}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9999,
                      boxShadow: '0 0 0 2px white',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9999,
                      background: u.color,
                      boxShadow: '0 0 0 2px white',
                    }}
                  />
                )}
                <span className="text-xs" style={{ color: 'var(--foreground)' }}>
                  {u.name || u.email}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v: boolean) => !v)}
        className="flex flex-col items-center gap-1 rounded-full border bg-card/90 px-2 py-2 drop-shadow-xs backdrop-blur-sm"
        style={{ position: 'relative' }}
      >
        {users.map((u) => (
          <div key={u.id} style={{ position: 'relative' }}>
            <div
              onMouseEnter={() => setHoverId(u.id)}
              onMouseLeave={() => setHoverId((curr) => (curr === u.id ? null : curr))}
              title={u.name || u.email}
              style={{
                width: 12,
                height: 12,
                borderRadius: 9999,
                background: u.color,
                boxShadow: '0 0 0 1px rgba(255,255,255,0.9)',
              }}
            />
            {hoverId === u.id ? (
              <div
                style={{
                  position: 'absolute',
                  right: 18,
                  top: -2,
                  background: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: 6,
                  fontSize: 10,
                  whiteSpace: 'nowrap',
                }}
              >
                {u.name || u.email}
              </div>
            ) : null}
          </div>
        ))}
      </button>
    </div>
  );
};

// Inline avatar stack (top‑right usage)
export const AvatarStack = () => {
  const me = useSelf();
  const others = useOthers();
  const users = [
    ...(me
      ? [{ id: me.connectionId, name: (me.info as any)?.name ?? 'You', avatar: (me.info as any)?.avatar as string | undefined, color: (me.info as any)?.color ?? '#06f' }]
      : []),
    ...others.map((u) => ({ id: u.connectionId, name: (u.info as any)?.name ?? 'User', avatar: (u.info as any)?.avatar as string | undefined, color: (u.info as any)?.color ?? '#06f' })),
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

// Simple connection status pill (connected / connecting / reconnecting / closed)
export const RoomStatus = () => {
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
    <div className="flex items-center gap-1 rounded-full border bg-card/90 px-2 py-1 text-xs drop-shadow-xs backdrop-blur-sm">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="capitalize">{String(status)}</span>
    </div>
  );
};


