'use client';

import { uploadFile } from '@/lib/upload';
import { transcribeAction } from '@/app/actions/speech/transcribe';
import { cn } from '@/lib/utils';
import { useReactFlow } from '@xyflow/react';
import { FileIcon, ImageIcon, VideoIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNodeOperations } from './node-operations';
import { useProject } from './project';

type NodeDropzoneProviderProps = {
  children: ReactNode;
};

export const NodeDropzoneProvider = ({
  children,
}: NodeDropzoneProviderProps) => {
  const { getViewport, setNodes } = useReactFlow();
  const { addNode } = useNodeOperations();
  const project = useProject();
  const dropzone = useDropzone({
    noClick: true,
    autoFocus: false,
    noKeyboard: true,
    disabled: !project,
    onDrop: async (acceptedFiles) => {
      const uploads = await Promise.all(
        acceptedFiles.map(async (file) => ({
          name: file.name,
          data: await uploadFile(file, 'files'),
        }))
      );

      // Get the current viewport
      const viewport = getViewport();

      // Calculate the center of the current viewport
      const centerX =
        -viewport.x / viewport.zoom + window.innerWidth / 2 / viewport.zoom;
      const centerY =
        -viewport.y / viewport.zoom + window.innerHeight / 2 / viewport.zoom;

      for (const { data, name } of uploads) {
        let nodeType = 'file';

        if (data.type.startsWith('image/')) {
          nodeType = 'image';
        } else if (data.type.startsWith('video/')) {
          nodeType = 'video';
        } else if (data.type.startsWith('audio/')) {
          nodeType = 'audio';
        }

        const newId = addNode(nodeType, {
          data: {
            content: {
              url: data.url,
              type: data.type,
              name,
            },
            // flag used by the Audio node to render a loading state
            ...(nodeType === 'audio' ? { transcribing: true } : {}),
          },
          position: {
            x: centerX,
            y: centerY,
          },
        });

        // Auto-transcribe audio drops
        if (nodeType === 'audio' && project?.id) {
          try {
            // ensure loading state is visible even if transcription takes time
            setNodes((nds) =>
              nds.map((n) =>
                n.id === newId
                  ? { ...n, data: { ...(n.data as any), transcribing: true } }
                  : n
              )
            );
            const result = await transcribeAction(data.url, project.id);
            if ('transcript' in result) {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === newId
                    ? {
                        ...n,
                        data: {
                          ...(n.data as any),
                          transcript: result.transcript,
                          transcribing: false,
                        },
                      }
                    : n
                )
              );
            } else {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === newId
                    ? {
                        ...n,
                        data: { ...(n.data as any), transcribing: false },
                      }
                    : n
                )
              );
            }
          } catch (err) {
            console.error('Audio auto-transcribe failed:', err);
            setNodes((nds) =>
              nds.map((n) =>
                n.id === newId
                  ? { ...n, data: { ...(n.data as any), transcribing: false } }
                  : n
              )
            );
          }
        }
      }
    },
  });

  return (
    <div {...dropzone.getRootProps()} className="size-full">
      <input
        {...dropzone.getInputProps()}
        className="pointer-events-none hidden select-none"
      />
      <div
        className={cn(
          'absolute inset-0 z-[999999] flex flex-col items-center justify-center gap-6 bg-background/70 text-foreground backdrop-blur-xl transition-all',
          dropzone.isDragActive
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        )}
      >
        <div className="-space-x-4 relative isolate flex items-center">
          <div className="-rotate-12 flex aspect-square translate-y-2 items-center justify-center rounded-md bg-background p-3 shadow-xl">
            <FileIcon size={24} className="text-muted-foreground" />
          </div>
          <div className="z-10 flex aspect-square items-center justify-center rounded-md bg-background p-3 shadow-xl">
            <ImageIcon size={24} className="text-muted-foreground" />
          </div>
          <div className="flex aspect-square translate-y-2 rotate-12 items-center justify-center rounded-md bg-background p-3 shadow-xl">
            <VideoIcon size={24} className="text-muted-foreground" />
          </div>
        </div>
        <p className="font-medium text-xl tracking-tight">
          Drop files to create nodes
        </p>
      </div>
      {children}
    </div>
  );
};
