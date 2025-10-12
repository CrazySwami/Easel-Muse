import { NodeLayout } from '@/components/nodes/layout';
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from '@/components/ui/kibo-ui/dropzone';
import { Skeleton } from '@/components/ui/skeleton';
import { handleError } from '@/lib/error/handle';
import { uploadFile } from '@/lib/upload';
import { useReactFlow } from '@xyflow/react';
import { Loader2Icon } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import type { VideoNodeProps } from '.';

type VideoPrimitiveProps = VideoNodeProps & {
  title: string;
};

export const VideoPrimitive = ({
  data,
  id,
  type,
  title,
}: VideoPrimitiveProps) => {
  const { updateNodeData } = useReactFlow();
  const [files, setFiles] = useState<File[] | undefined>();
  const [isUploading, setIsUploading] = useState(false);

  const handleDrop = async (files: File[]) => {
    if (isUploading) {
      return;
    }

    try {
      if (!files.length) {
        throw new Error('No file selected');
      }

      setIsUploading(true);
      setFiles(files);

      const [file] = files;
      const { url, type } = await uploadFile(file, 'files');

      updateNodeData(id, {
        content: {
          url,
          type,
        },
      });
    } catch (error) {
      handleError('Error uploading video', error);
    } finally {
      setIsUploading(false);
    }
  };

  const toolbar: ComponentProps<typeof NodeLayout>['toolbar'] = [
    { children: <div className="px-2 text-xs text-muted-foreground">Plain video</div> },
  ];

  return (
    <NodeLayout id={id} data={{ ...data, width: data.width ?? 1280, height: data.height ?? 720, resizable: false, dualModeSupported: true, titleOverride: 'Video' }} type={type} title={title} toolbar={toolbar}>
      <div className="flex h-full min-h-0 flex-col p-3">
        {isUploading && (
          <Skeleton className="flex h-full w-full animate-pulse items-center justify-center rounded-2xl">
            <Loader2Icon size={16} className="size-4 animate-spin text-muted-foreground" />
          </Skeleton>
        )}
        {!isUploading && data.content && (
          <div className="flex h-full min-h-0 items-center justify-center overflow-hidden rounded-2xl border bg-card">
            {/* biome-ignore lint/a11y/useMediaCaption: preview */}
            <video src={data.content.url} className="h-full w-full object-contain" autoPlay muted loop />
          </div>
        )}
        {!isUploading && !data.content && (
          <div className="flex h-full min-h-0 items-center justify-center">
            <Dropzone
              maxSize={1024 * 1024 * 10}
              minSize={1024}
              maxFiles={1}
              multiple={false}
              accept={{ 'video/*': [] }}
              onDrop={handleDrop}
              src={files}
              onError={console.error}
              className="rounded-none border-none bg-transparent shadow-none hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
            >
              <DropzoneEmptyState className="p-6" />
              <DropzoneContent />
            </Dropzone>
          </div>
        )}
      </div>
    </NodeLayout>
  );
};
