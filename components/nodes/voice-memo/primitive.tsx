import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { handleError } from '@/lib/error/handle';
import { uploadFile } from '@/lib/upload';
import { useReactFlow } from '@xyflow/react';
import { MicIcon, SquareIcon, Loader2Icon } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { toast } from 'sonner';
import type { VoiceMemoNodeProps } from '.';

type VoiceMemoPrimitiveProps = VoiceMemoNodeProps & {
  title: string;
};

export const VoiceMemoPrimitive = ({
  data,
  id,
  type,
  title,
}: VoiceMemoPrimitiveProps) => {
  const { updateNodeData } = useReactFlow();
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const MAX_SECONDS = 20 * 60; // 20 minutes

  const clearTimer = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startRecording = async () => {
    if (isRecording || isUploading) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        try {
          setIsUploading(true);
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const file = new File(
            [blob],
            `voice-memo-${nanoid()}.${mimeType.includes('webm') ? 'webm' : 'm4a'}`,
            {
              type: mimeType,
            },
          );
          const { url, type } = await uploadFile(file, 'files');

          updateNodeData(id, {
            content: { url, type },
            updatedAt: new Date().toISOString(),
          });

          toast.success('Voice memo recorded');
        } catch (error) {
          handleError('Error recording audio', error);
        } finally {
          setIsUploading(false);
          setIsRecording(false);
          mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
          mediaRecorderRef.current = null;
          setElapsedSeconds(0);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      // start timer
      setElapsedSeconds(0);
      clearTimer();
      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stopRecording();
          }
          return s + 1;
        });
      }, 1000);
      setIsRecording(true);
    } catch (error) {
      handleError('Microphone access error', error);
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    clearTimer();
  };

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);
  
  const createToolbar = (): ComponentProps<typeof NodeLayout>['toolbar'] => {
    const toolbar: ComponentProps<typeof NodeLayout>['toolbar'] = [];
    toolbar.push({
      children: (
        <div className="flex items-center gap-2 px-2">
          <MicIcon className="h-4 w-4" />
          <span className="text-xs font-medium">Voice Memo</span>
        </div>
      ),
    });
    return toolbar;
  }

  return (
    <NodeLayout id={id} data={data} type={type} title={title} toolbar={createToolbar()}>
      <div className="flex flex-col gap-2 p-2">
        {!data.content && !isRecording && !isUploading && (
          <Button
            size="sm"
            onClick={startRecording}
            className="w-full rounded-full"
          >
            <MicIcon className="mr-1" size={14} /> Start Recording
          </Button>
        )}
        {isRecording && (
          <div className='flex items-center gap-2'>
            <Button
              size="sm"
              variant="destructive"
              onClick={stopRecording}
              className="w-full rounded-full"
            >
              <SquareIcon className="mr-1" size={14} /> Stop Recording
            </Button>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(elapsedSeconds * 1000).toISOString().substring(14, 19)}
            </span>
          </div>
        )}
        {isUploading && (
          <div className="flex items-center justify-center p-4">
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {data.content && !isUploading && (
          <div
            className="nodrag nopan nowheel"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <audio
              src={data.content.url}
              controls
              draggable={false}
              className="w-full rounded-none"
            />
          </div>
        )}
      </div>
    </NodeLayout>
  );
};
