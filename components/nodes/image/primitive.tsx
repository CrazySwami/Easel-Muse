import { describeAction } from '@/app/actions/image/describe';
import { NodeLayout } from '@/components/nodes/layout';
import { DropzoneEmptyState } from '@/components/ui/kibo-ui/dropzone';
import { DropzoneContent } from '@/components/ui/kibo-ui/dropzone';
import { Dropzone } from '@/components/ui/kibo-ui/dropzone';
import { Skeleton } from '@/components/ui/skeleton';
import { handleError } from '@/lib/error/handle';
import { uploadFile } from '@/lib/upload';
import { useProject } from '@/providers/project';
import { useReactFlow } from '@xyflow/react';
import { Loader2Icon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import type { ImageNodeProps } from '.';

type ImagePrimitiveProps = ImageNodeProps & {
  title: string;
};

export const ImagePrimitive = ({
  data,
  id,
  type,
  title,
}: ImagePrimitiveProps) => {
  const { updateNodeData } = useReactFlow();
  const project = useProject();
  const [files, setFiles] = useState<File[] | undefined>();
  const [isUploading, setIsUploading] = useState(false);

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
      const { url, type } = await uploadFile(file, 'files');

      updateNodeData(id, {
        content: {
          url,
          type,
        },
      });

      const description = await describeAction(url, project?.id);

      if ('error' in description) {
        throw new Error(description.error);
      }

      updateNodeData(id, {
        description: description.description,
      });
    } catch (error) {
      handleError('Error uploading image', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <NodeLayout id={id} data={{ ...data, width: data.width ?? 840, height: data.height ?? 560, resizable: false }} type={type} title={title}>
      <div className="flex h-full min-h-0 flex-col p-3">
        {isUploading && (
          <Skeleton className="flex h-full w-full animate-pulse items-center justify-center rounded-2xl">
            <Loader2Icon size={16} className="size-4 animate-spin text-muted-foreground" />
          </Skeleton>
        )}
        {!isUploading && data.content && (
          <div className="flex h-full min-h-0 items-center justify-center overflow-hidden rounded-2xl border bg-card">
            <Image
              src={data.content.url}
              alt="Image"
              width={data.width ?? 1600}
              height={data.height ?? 1200}
              className="h-full w-full object-contain"
            />
          </div>
        )}
        {!isUploading && !data.content && (
          <div className="flex h-full min-h-0 items-center justify-center">
            <Dropzone
              maxSize={1024 * 1024 * 10}
              minSize={1024}
              maxFiles={1}
              multiple={false}
              accept={{ 'image/*': [] }}
              onDrop={handleDrop}
              src={files}
              onError={console.error}
              className="rounded-none border-none bg-transparent p-0 shadow-none hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
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
