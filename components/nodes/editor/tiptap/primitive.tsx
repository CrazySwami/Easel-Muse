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
import { useLocks } from '@/providers/locks';

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
  readOnly?: boolean;
};

const TiptapEditor = ({ data, id, doc, provider, readOnly = false }: TiptapEditorProps) => {
    const { updateNodeData } = useReactFlow();
    const { threads } = useThreads();

    const yXmlFragment = doc.get(
      `tiptap-${id}`,
      Y.XmlFragment,
    ) as Y.XmlFragment;

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            // Keep history enabled (default); no override needed
            StarterKit.configure({}),
            Placeholder.configure({
                placeholder: 'Start typing your collaborative document...',
            }),
            Typography,
            Underline,
            Highlight,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({
                openOnClick: false,
            }),
            // Liveblocks extension registered after mount to avoid setState during render
        ],
        editorProps: {
            attributes: {
                class: 'focus:outline-none p-4 h-full w-full',
            },
        },
        editable: !readOnly,
        content: data.content ?? {
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            text: '',
                        },
                    ],
                },
            ],
        },
    });

    useEffect(() => {
        if (!editor) return;
        // Defer Liveblocks extension until editor is ready
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (editor as any)?.registerPlugin?.(useLiveblocksExtension({
            fragment: yXmlFragment,
            allowExtension: ({ editor }: { editor: any }) => editor.isEditable,
          } as any));
        } catch {}
    }, [editor, yXmlFragment]);

    useEffect(() => {
        if (!editor) return;

        editor.setEditable(!readOnly);
        if (readOnly) {
            editor.commands.blur();
        }
    }, [editor, readOnly]);

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
            {editor && editor.view && !editor.isDestroyed && (
                <div className="sticky top-0 z-10 bg-primary text-primary-foreground [&_svg]:text-primary-foreground [&_button]:text-primary-foreground">
                    <Toolbar
                      editor={editor}
                      className="lb-toolbar-compact flex h-10 w-full items-center gap-1.5 overflow-x-auto whitespace-nowrap px-3 py-2 text-sm leading-none
                      [&_*]:!text-sm [&_*]:!leading-none
                      [&_svg]:!h-4 [&_svg]:!w-4
                      [&_button]:!h-8 [&_button]:!min-w-8 [&_button]:!w-8 [&_button]:!px-0 [&_button]:!py-0 [&_button]:!rounded-md [&_button]:shrink-0
                      [&_[data-liveblocks-ui='Toolbar.SelectTrigger']]:!h-8 [&_[data-liveblocks-ui='Toolbar.SelectTrigger']]:!px-2 [&_[data-liveblocks-ui='Toolbar.SelectTrigger']]:shrink-0"/>
                </div>
            )}
            {editor && editor.view && !editor.isDestroyed && (
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
            <div className="relative h-full w-full">
                <EditorContent editor={editor} className="h-full w-full bg-card text-foreground p-6" />
                {editor && editor.view && !editor.isDestroyed && (
                    <>
                        <FloatingThreads threads={threads ?? []} editor={editor} className="lb-threads" />
                        <FloatingComposer editor={editor} className="lb-composer w-[350px]" />
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
  const reactFlow = useReactFlow();
  
  // Allow per-node overrides via data.width/height
  const width = (props.data as any)?.width ?? 920;
  const height = (props.data as any)?.height ?? 1160;
  const { getLock } = useLocks();
  const lock = getLock(props.id);
  const isEditLocked = lock?.level === 'edit';
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

  useEffect(() => {
    if ('updateNodeInternals' in reactFlow && typeof reactFlow.updateNodeInternals === 'function') {
      reactFlow.updateNodeInternals(props.id);
    }
  }, [props.id, width, height, reactFlow]);

  return (
    <NodeLayout
      id={props.id}
      data={{ ...props.data, width, height, resizable: false }}
      type={props.type}
      title={props.title}
      toolbar={createToolbar()}
      className="min-h-[720px]"
    >
      {/* "Fill Frame" Pattern: Direct child has h-full */}
      <div className="flex h-full flex-col gap-3 p-3">
        <div className="shrink-0 flex items-center justify-between rounded-2xl border border-border bg-card/60 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileTextIcon className="h-4 w-4" />
            <span>Live collaborative document</span>
          </div>
          {props.data?.updatedAt ? (
            <span className="text-xs text-muted-foreground">
              Last edited {new Date(props.data.updatedAt).toLocaleString()}
            </span>
          ) : null}
        </div>

        {/* Editor Content: flex-1 makes it grow and overflow-auto enables scrolling */}
        <div
          className="flex-1 overflow-auto rounded-3xl border border-border bg-card"
          style={inInspector ? { width: '100%', height: '100%' } : undefined}
        >
          <div
            className="h-full"
          >
            <div
              className="nodrag nopan h-full"
              onPointerDown={(event) => event.stopPropagation()}
            >
              {provider ? (
                <TiptapEditor
                  data={props.data}
                  id={props.id}
                  type={props.type}
                  doc={doc}
                  provider={provider}
                  readOnly={isEditLocked}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Loader2Icon className="h-6 w-6 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </NodeLayout>
  );
};
