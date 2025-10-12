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
import { useEffect, type ComponentProps, useRef } from 'react';
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
            // Type definitions may vary across versions; cast to any to satisfy TS
            // Type definitions may vary across versions; cast to any to satisfy TS
            // Defer Liveblocks side-effects to after initial mount to avoid setState during render
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
        if (!yXmlFragment) return;
        // Attach the Liveblocks extension after render
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (editor as any)?.registerPlugin?.(useLiveblocksExtension({
            fragment: yXmlFragment,
            allowExtension: ({ editor }: { editor: any }) => editor.isEditable,
        } as any));
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
      <div className="w-full">
        {editor && (
          <Toolbar
            editor={editor}
            className="lb-toolbar-compact sticky top-0 z-10 flex h-9 w-full items-center gap-1.5 overflow-x-auto whitespace-nowrap border-b border-border bg-card px-3 text-sm [&_*]:!text-sm [&_svg]:!h-4 [&_svg]:!w-4 [&_button]:!h-8 [&_button]:!px-1"
          />
        )}
        <EditorContent editor={editor} className="w-full bg-card p-3" />
        {/* Liveblocks threads UI */}
        {editor && (
          <>
            <FloatingThreads editor={editor as any} threads={threads as any} className="!max-w-[420px] !rounded-2xl !border !bg-card !text-foreground [&_*]:!text-sm" />
            <FloatingComposer editor={editor as any} className="!max-w-[420px] !rounded-2xl !border !bg-card !text-foreground" />
          </>
        )}
      </div>
    );
};


type TiptapPrimitiveProps = TiptapNodeProps & {
  title: string;
};

export const TiptapPrimitive = (props: TiptapPrimitiveProps) => {
  const { doc, provider } = useYDoc();
  const reactFlow = useReactFlow();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  
  // Fill Frame pattern: explicit width/height so inner area can scroll
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

  const restData = (props.data as any) ?? {};

  // Stop canvas pan/zoom when interacting with the editor scroll region
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const stop = (e: Event) => {
      e.stopPropagation();
    };
    el.addEventListener('wheel', stop, { passive: true }); // allow native scroll, stop bubbling
    el.addEventListener('touchmove', stop, { passive: true });
    el.addEventListener('pointerdown', stop, { passive: true });
    return () => {
      el.removeEventListener('wheel', stop as any);
      el.removeEventListener('touchmove', stop as any);
      el.removeEventListener('pointerdown', stop as any);
    };
  }, []);

  return (
    <NodeLayout
      id={props.id}
      data={{ ...restData, width, height, resizable: false }}
      type={props.type}
      title={props.title}
      toolbar={createToolbar()}
    >
      {/* Fill Frame pattern */}
      <div className="flex h-full flex-col min-h-0 p-3">
        {/* Fixed header */}
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

        {/* Scrollable editor area */}
        <div
          ref={scrollRef}
          className="nowheel nodrag nopan overscroll-contain flex-1 min-h-0 overflow-auto rounded-3xl border border-border bg-card"
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
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
    </NodeLayout>
  );
};
