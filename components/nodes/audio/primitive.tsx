import { transcribeAction } from '@/app/actions/speech/transcribe';
import { NodeLayout } from '@/components/nodes/layout';
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from '@/components/ui/kibo-ui/dropzone';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { handleError } from '@/lib/error/handle';
import { uploadFile } from '@/lib/upload';
import { useProject } from '@/providers/project';
import { useReactFlow } from '@xyflow/react';
import { Loader2Icon, MicIcon, SquareIcon, CopyIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useEffect, useRef, useState } from 'react';
import type { AudioNodeProps } from '.';

type AudioPrimitiveProps = AudioNodeProps & {
  title: string;
};

export const AudioPrimitive = ({
  data,
  id,
  type,
  title,
}: AudioPrimitiveProps) => {
  const { updateNodeData } = useReactFlow();
  const [files, setFiles] = useState<File[] | undefined>();
  const project = useProject();
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
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
      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm')
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
          const file = new File([blob], `${nanoid()}.${mimeType.includes('webm') ? 'webm' : 'm4a'}`, {
            type: mimeType,
          });
          const { url, type } = await uploadFile(file, 'files');

          updateNodeData(id, {
            content: { url, type },
          });

          // Use the live timer as duration (seconds). If zero, omit billing.
          setIsTranscribing(true);
          const response = await transcribeAction(
            url,
            project?.id ?? '',
            elapsedSeconds > 0 ? elapsedSeconds : undefined
          );
          if ('error' in response) throw new Error(response.error);
          updateNodeData(id, { transcript: response.transcript });
        } catch (error) {
          handleError('Error recording audio', error);
        } finally {
          setIsUploading(false);
          setIsTranscribing(false);
          setIsRecording(false);
          mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
          mediaRecorderRef.current = null;
          setElapsedSeconds(0);
          setIsPaused(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      // start timer
      setElapsedSeconds(0);
      setIsPaused(false);
      clearTimer();
      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            // auto-stop at 20 minutes
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

  const pauseRecording = () => {
    if (!isRecording || !mediaRecorderRef.current || isPaused) return;
    try {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearTimer();
    } catch {}
  };

  const resumeRecording = () => {
    if (!isRecording || !mediaRecorderRef.current || !isPaused) return;
    try {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      // resume timer
      clearTimer();
      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stopRecording();
          }
          return s + 1;
        });
      }, 1000);
    } catch {}
  };

  // Cleanup timer on unmount to avoid update depth loops
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  const handleDrop = async (files: File[]) => {
    if (isUploading || !project?.id) {
      return;
    }

    try {
      if (!files.length) {
        throw new Error('No file selected');
      }

      setIsUploading(true);
      setFiles(files);
      const [file] = files;

      // Validate MIME/extension before attempting upload
      const allowedMime = new Set([
        'audio/mpeg', // mp3
        'audio/wav',
        'audio/webm',
        'audio/mp4', // m4a/mp4
        'audio/ogg',
      ]);
      const allowedExt = new Set(['mp3', 'wav', 'webm', 'm4a', 'mp4', 'ogg']);
      const ext = String(file.name.split('.').pop() || '').toLowerCase();
      if (!allowedMime.has(file.type) && !allowedExt.has(ext)) {
        handleError(
          'Error uploading audio',
          'Unsupported audio type. Allowed: MP3, WAV, WEBM, M4A/MP4, OGG.'
        );
        setIsUploading(false);
        return;
      }

      // Enforce explicit upload size limit (matches Dropzone maxSize)
      const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error(
          `Audio file is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max size is 10 MB.`
        );
      }

      const { url, type } = await uploadFile(file, 'files');

      updateNodeData(id, {
        content: {
          url,
          type,
        },
      });

      setIsTranscribing(true);
      const response = await transcribeAction(url, project?.id, undefined);

      if ('error' in response) {
        throw new Error(response.error);
      }

      updateNodeData(id, {
        transcript: response.transcript,
      });
    } catch (error) {
      handleError('Error uploading video', error);
    } finally {
      setIsUploading(false);
      setIsTranscribing(false);
    }
  };

  return (
    <NodeLayout id={id} data={{ ...data, width: 840, height: 560, resizable: false }} type={type} title={title}>
      {/* Recording controls zone (top) */}
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-2xl border bg-card/60 px-3 py-2">
          {!isRecording && (
            <Button size="sm" onClick={startRecording} disabled={isUploading || isTranscribing} className="rounded-full">
              <MicIcon className="mr-1" size={14} /> Record
            </Button>
          )}
          {isRecording && !isPaused && (
            <Button size="sm" variant="destructive" onClick={stopRecording} className="rounded-full">
              <SquareIcon className="mr-1" size={14} /> Stop
            </Button>
          )}
          {isRecording && !isPaused && (
            <Button size="sm" variant="secondary" onClick={pauseRecording} className="rounded-full">
              Pause
            </Button>
          )}
          {isRecording && isPaused && (
            <Button size="sm" onClick={resumeRecording} className="rounded-full">
              Resume
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(elapsedSeconds * 1000).toISOString().substring(14, 19)} / 20:00
          </span>
          {(isTranscribing || (data as any)?.transcribing) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground">
              <Loader2Icon className="size-3 animate-spin" />
              Transcribing…
            </span>
          )}
      </div>
      {isUploading && (
        <Skeleton className="flex h-[50px] w-full animate-pulse items-center justify-center">
          <Loader2Icon
            size={16}
            className="size-4 animate-spin text-muted-foreground"
          />
        </Skeleton>
      )}
      {!isUploading && data.content && (
        <div className="nodrag nopan nowheel">
          {/* biome-ignore lint/a11y/useMediaCaption: native controls */}
          <audio
            src={data.content.url}
            controls
            draggable={false}
            className="w-full rounded-none"
          />
        </div>
      )}
      {!isUploading && data.transcript && (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Transcript</span>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full"
              onClick={() => navigator.clipboard.writeText(data.transcript ?? '')}
            >
              <CopyIcon size={14} />
            </Button>
          </div>
          <div className="nowheel nodrag nopan min-h-0 flex-1 overflow-auto rounded-md border bg-background p-2 text-sm whitespace-pre-wrap"
               onPointerDown={(e) => e.stopPropagation()}>
            {data.transcript}
          </div>
        </div>
      )}
      {/* Upload section (bottom zone) */}
      {!isUploading && (
        <Dropzone
          maxSize={1024 * 1024 * 10}
          minSize={1024}
          maxFiles={1}
          multiple={false}
          accept={{
            'audio/mpeg': ['.mp3'],
            'audio/wav': ['.wav'],
            'audio/webm': ['.webm'],
            'audio/mp4': ['.m4a', '.mp4'],
            'audio/ogg': ['.ogg'],
          }}
          onDrop={handleDrop}
          src={files}
          onError={(errors) => {
            let message = 'Audio file rejected.';
            if (Array.isArray(errors) && errors.length) {
              message = errors[0]?.message ?? message;
              // Tweak message for oversize
              if (/File is larger than/.test(message)) {
                message = 'Audio file is too large. Max size is 10 MB.';
              }
              if (/file type/i.test(message)) {
                message = 'Unsupported audio type. Allowed: MP3, WAV, WEBM, M4A/MP4, OGG.';
              }
            }
            handleError('Error uploading audio', message);
          }}
          className="rounded-none border-none bg-transparent shadow-none hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
        >
          <DropzoneEmptyState />
          <DropzoneContent />
        </Dropzone>
      )}
    </NodeLayout>
  );
};
