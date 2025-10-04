import { EditorProvider } from '@/components/ui/kibo-ui/editor';
import { cn } from '@/lib/utils';
import { useProject } from '@/providers/project';
import type { Editor, EditorEvents } from '@tiptap/core';
import { useReactFlow } from '@xyflow/react';
import { useEffect, useRef } from 'react';
import { useLocks } from '@/providers/locks';
import type { TextNodeProps } from '.';
import { NodeLayout } from '../layout';

type TextPrimitiveProps = TextNodeProps & {
  title: string;
};

export const TextPrimitive = ({
  data,
  id,
  type,
  title,
}: TextPrimitiveProps) => {
  const { updateNodeData } = useReactFlow();
  const editor = useRef<Editor | null>(null);
  const project = useProject();
  const { getLock } = useLocks();
  const lock = getLock(id);
  const isEditLocked = lock?.level === 'edit';

  const handleUpdate = ({ editor }: { editor: Editor }) => {
    const json = editor.getJSON();
    const text = editor.getText();

    updateNodeData(id, { content: json, text });
  };

  const handleCreate = (props: EditorEvents['create']) => {
    editor.current = props.editor;

    if (project) {
      props.editor.chain().focus().run();
    }
  };

  useEffect(() => {
    if (!editor.current) return;

    const instance = editor.current;
    instance.setEditable(!isEditLocked);
    if (isEditLocked) {
      instance.commands.blur();
    }
  }, [isEditLocked]);

  return (
    <NodeLayout
      id={id}
      data={data}
      title={title}
      type={type}
      className="overflow-hidden p-0 w-80"
    >
      <div className="h-full max-h-[30rem] overflow-auto nowheel">
        <div
          className="group-data-[selected=true]:nodrag group-data-[selected=true]:nopan"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <EditorProvider
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            immediatelyRender={false}
            content={data.content || '<p></p>'}
            placeholder="Start typing..."
            className={cn(
              'prose prose-sm dark:prose-invert size-full p-6 min-h-[200px]',
              'primitive-editor', // <-- New specific class
              'prose-p:my-0 prose-p:leading-snug',
              '[&_p:first-child]:mt-0',
              '[&_p:last-child]:mb-0',
              // Allow canvas gestures to work by disabling TipTap's gesture handling
              '[&_.ProseMirror]:touch-action-manipulation',
              '[&_.ProseMirror]:overscroll-behavior-none'
            )}
          />
        </div>
      </div>
    </NodeLayout>
  );
};
