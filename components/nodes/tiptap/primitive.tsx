'use client';

import { NodeLayout } from '@/components/nodes/layout';
import { useYDoc } from '@/providers/liveblocks';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import { useLiveblocksExtension, Toolbar, FloatingComposer, FloatingThreads } from '@liveblocks/react-tiptap';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import { useEffect, type ComponentProps } from 'react';
import { useReactFlow } from '@xyflow/react';
import * as Y from 'yjs';
import type { TiptapNodeProps } from '.';
import { FileTextIcon, Loader2Icon, BoldIcon, ItalicIcon, StrikethroughIcon, Heading1Icon, Heading2Icon } from 'lucide-react';
import { useThreads } from '@liveblocks/react';

// A simple debounce function
function debounce<T extends (...args: any[]) => any>(func: T, delay: number) {
  let timeout: NodeJS.Timeout;
  return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}


type TiptapEditorProps = TiptapNodeProps & {
    doc: Y.Doc;
    provider: NonNullable<ReturnType<typeof useYDoc>['provider']>;
};

const TiptapEditor = ({ data, id, doc, provider }: TiptapEditorProps) => {
    const { updateNodeData } = useReactFlow();
    const { threads } = useThreads();

    const yXmlFragment = doc.get(
      `tiptap-${id}`,
      Y.XmlFragment,
    ) as Y.XmlFragment;

    const editor = useEditor({
        extensions: [
            // Keep history enabled (default); no override needed
            StarterKit.configure({}),
            Placeholder.configure({
                placeholder: 'Start typing your collaborative document...',
            }),
            Typography,
            Underline,
            Highlight,
            Link.configure({
                autolink: true,
                linkOnPaste: true,
                openOnClick: false,
                validate: (href: string) => /^https?:\/\//.test(href),
            }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            // Type definitions may vary across versions; cast to any to satisfy TS
            useLiveblocksExtension({
                provider,
                fragment: yXmlFragment,
            } as any),
        ],
        editorProps: {
            attributes: {
                class: 'focus:outline-none p-4 h-full w-full',
            },
        },
    });

    useEffect(() => {
        const handleSync = () => {
            if (!editor || editor.isDestroyed || yXmlFragment.length > 0 || !data.content) {
                return;
            }
            editor.commands.setContent(data.content, false);
        }
        
        provider.on('synced', handleSync);

        return () => {
            provider.off('synced', handleSync);
        };
    }, [provider, editor, data.content, yXmlFragment]);

    useEffect(() => {
        if (!editor) return;

        const saveContent = () => {
            if (editor.isDestroyed) return;
            const content = editor.getJSON();
            updateNodeData(id, {
                content,
                updatedAt: new Date().toISOString(),
            });
        };

        const debouncedSave = debounce(saveContent, 1000);
        editor.on('update', debouncedSave);

        return () => {
            editor.off('update', debouncedSave);
        };
    }, [editor, id, updateNodeData]);


    return (
        <div className="lb-tiptap flex h-full w-full flex-col">
            {editor && (
                <div className="sticky top-0 z-10 bg-primary text-primary-foreground [&_svg]:text-primary-foreground [&_button]:text-primary-foreground">
                    <Toolbar
                      editor={editor}
                      className="lb-toolbar-compact flex h-10 w-full items-center gap-1.5 md:gap-2 overflow-x-auto whitespace-nowrap px-3 pr-3 py-2 text-sm leading-none
                      [&_*]:!text-sm [&_*]:!leading-none
                      [&_svg]:!h-4 [&_svg]:!w-4
                      [&_button]:!h-8 [&_button]:!min-w-8 [&_button]:!w-8 [&_button]:!px-0 [&_button]:!py-0 [&_button]:!rounded-md [&_button]:shrink-0
                      [&_[data-liveblocks-ui='Toolbar.SelectTrigger']]:!h-8 [&_[data-liveblocks-ui='Toolbar.SelectTrigger']]:!px-2 [&_[data-liveblocks-ui='Toolbar.SelectTrigger']]:shrink-0
                      "
                    />
                </div>
            )}
            {editor && (
                <BubbleMenu
                    editor={editor}
                    tippyOptions={{ duration: 100 }}
                    className="flex items-center gap-1 rounded-md border bg-background p-1 shadow-md"
                >
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`rounded-md p-2 hover:bg-muted ${editor.isActive('bold') ? 'bg-muted' : ''}`}
                    >
                        <BoldIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`rounded-md p-2 hover:bg-muted ${editor.isActive('italic') ? 'bg-muted' : ''}`}
                    >
                        <ItalicIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className={`rounded-md p-2 hover:bg-muted ${editor.isActive('strike') ? 'bg-muted' : ''}`}
                    >
                        <StrikethroughIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={`rounded-md p-2 hover:bg-muted ${editor.isActive('heading', { level: 1 }) ? 'bg-muted' : ''}`}
                    >
                        <Heading1Icon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`rounded-md p-2 hover:bg-muted ${editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}`}
                    >
                        <Heading2Icon className="h-4 w-4" />
                    </button>
                </BubbleMenu>
            )}
            <div
              className="relative h-full w-full"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onPointerMove={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
                <EditorContent editor={editor} className="h-full w-full bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 p-4" />
                {editor && (
                    <>
                        <FloatingThreads threads={threads ?? []} editor={editor} />
                        <FloatingComposer editor={editor} className="w-[350px]" />
                    </>
                )}
            </div>
        </div>
    );
};


type TiptapPrimitiveProps = TiptapNodeProps & {
  title: string;
};

export const TiptapPrimitive = (props: TiptapPrimitiveProps) => {
  const { doc, provider } = useYDoc();
  
  // Allow per-node overrides via data.width/height, else use paper-like defaults
  const width = (props.data as any)?.width ?? 1440;
  const height = (props.data as any)?.height ?? 1600;
  const inInspector = Boolean((props.data as any)?.inspector);

  const createToolbar = (): ComponentProps<typeof NodeLayout>['toolbar'] => {
    return [
      {
        children: (
          <div className="flex items-center gap-2 px-2">
            <FileTextIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Collaborative Editor</span>
          </div>
        ),
      },
    ];
  };

  return (
    <NodeLayout
      id={props.id}
      data={props.data}
      type={props.type}
      title={props.title}
      toolbar={createToolbar()}
    >
      <div
        className="nodrag nopan nowheel overflow-auto rounded-xl border bg-background shrink-0"
        style={inInspector ? { width: '100%', height: '100%' } : { width, height }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {provider ? (
          <TiptapEditor data={props.data} id={props.id} type={props.type} doc={doc} provider={provider} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Loader2Icon className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>
    </NodeLayout>
  );
};
