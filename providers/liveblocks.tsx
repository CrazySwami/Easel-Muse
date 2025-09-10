'use client';

import { RoomProvider, ClientSideSuspense, useMyPresence, useOthers } from '@liveblocks/react';
import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';

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


