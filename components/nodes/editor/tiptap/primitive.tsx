    'use client';

import { NodeLayout } from '@/components/nodes/layout';
import { useYDoc } from '@/providers/liveblocks';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import { useLiveblocksExtension } from '@liveblocks/react-tiptap';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import Heading from '@tiptap/extension-heading';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Extension } from '@tiptap/core';
import { Mark } from '@tiptap/core';
// Lists and blockquote are provided by StarterKit
import { useEffect, type ComponentProps, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import * as Y from 'yjs';
import type { TiptapNodeProps } from '.';
import {
  FileTextIcon,
  Loader2Icon,
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  Heading1Icon,
  Heading2Icon,
  UnderlineIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  CodeIcon,
  Undo2Icon,
  Redo2Icon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  MessageSquareIcon,
  MessageSquarePlusIcon,
  TypeIcon,
} from 'lucide-react';
import { useLocks } from '@/providers/locks';
import { useSelf } from '@liveblocks/react';
import { nanoid } from 'nanoid';
import { CommentSidebar } from './comment-sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// A simple debounce function
function debounce<T extends (...args: any[]) => any>(func: T, delay: number) {
  let timeout: NodeJS.Timeout;
  return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Custom FontFamily Extension
const FontFamily = Extension.create({
  name: 'fontFamily',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: element => element.style.fontFamily?.replace(/['"]/g, '') || null,
            renderHTML: attributes => {
              if (!attributes.fontFamily) return {};
              return { style: `font-family: ${attributes.fontFamily}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontFamily: (fontFamily: string) => ({ chain }: any) => {
        return chain()
          .focus()
          .extendMarkRange('textStyle')
          .setMark('textStyle', { fontFamily })
          .run();
      },
      unsetFontFamily: () => ({ chain }: any) => {
        return chain()
          .focus()
          .extendMarkRange('textStyle')
          .setMark('textStyle', { fontFamily: null })
          .removeEmptyTextStyle()
          .run();
      },
    } as any;
  },
});

// Custom FontSize Extension
const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: any) => {
        return chain()
          .focus()
          .extendMarkRange('textStyle')
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }: any) => {
        return chain()
          .focus()
          .extendMarkRange('textStyle')
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    } as any;
  },
});

// Custom Comment Mark Extension
const Comment = Mark.create({
  name: 'comment',
  inclusive: false,
  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-id'),
        renderHTML: attributes => {
          if (!attributes.commentId) return {};
          return { 'data-comment-id': attributes.commentId };
        },
      },
      userId: {
        default: null,
        parseHTML: element => element.getAttribute('data-user-id'),
        renderHTML: attributes => {
          if (!attributes.userId) return {};
          return { 'data-user-id': attributes.userId };
        },
      },
      userName: {
        default: null,
        parseHTML: element => element.getAttribute('data-user-name'),
        renderHTML: attributes => {
          if (!attributes.userName) return {};
          return { 'data-user-name': attributes.userName };
        },
      },
      userColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-user-color'),
        renderHTML: attributes => {
          if (!attributes.userColor) return {};
          return { 'data-user-color': attributes.userColor };
        },
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const color = HTMLAttributes['data-user-color'] || '#fef08a';
    return [
      'span',
      {
        ...HTMLAttributes,
        class: 'comment-highlight cursor-pointer rounded-sm px-0.5 transition-all hover:shadow-md',
        style: `background-color: ${color}; background-opacity: 0.3;`,
      },
      0,
    ];
  },
  addCommands() {
    return {
      setComment: (attributes: { commentId: string; userId: string; userName: string; userColor?: string }) => ({ commands }: any) => {
        return commands.setMark(this.name, attributes);
      },
      unsetComment: () => ({ commands }: any) => {
        return commands.unsetMark(this.name);
      },
    } as any;
  },
});

type CommentThread = {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userColor?: string;
  timestamp: string;
  resolved: boolean;
  replies: Array<{
    id: string;
    text: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    timestamp: string;
  }>;
};

type TiptapEditorProps = TiptapNodeProps & {
  doc: Y.Doc;
  provider: NonNullable<ReturnType<typeof useYDoc>['provider']>;
  readOnly?: boolean;
};

const TiptapEditor = ({ data, id, doc, provider, readOnly = false }: TiptapEditorProps) => {
    const { updateNodeData } = useReactFlow();

    const yXmlFragment = doc.get(
      `tiptap-${id}`,
      Y.XmlFragment,
    ) as Y.XmlFragment;

    const me = useSelf();
    const [comments, setComments] = useState<Record<string, CommentThread>>({});
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

    // Set up Yjs Map for comments
    const yCommentsMap = doc.getMap(`tiptap-comments-${id}`) as Y.Map<CommentThread>;

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                bulletList: { keepMarks: true },
                orderedList: { keepMarks: true },
                codeBlock: false,
            }),
            Placeholder.configure({
                placeholder: 'Start typing your collaborative document...',
            }),
            Typography,
            Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
            TextStyle,
            FontFamily,
            FontSize,
            Color,
            Underline,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({
                openOnClick: false,
            }),
            Comment,
        ],
        editorProps: {
            attributes: {
                class: 'focus:outline-none p-4 h-full w-full',
            },
            handleClickOn: (_view, _pos, _node, _nodePos, event) => {
                const target = event.target as HTMLElement | null;
                if (!target) return false;
                const el = target.closest('span[data-comment-id]') as HTMLElement | null;
                if (el) {
                    const id = el.getAttribute('data-comment-id');
                    if (id) {
                        setActiveCommentId(id);
                        setSidebarOpen(true);
                        return true;
                    }
                }
                return false;
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

    // Sync Yjs comments to local state
    useEffect(() => {
        const syncComments = () => {
            const commentsObj: Record<string, CommentThread> = {};
            yCommentsMap.forEach((value, key) => {
                commentsObj[key] = value;
            });
            setComments(commentsObj);
        };

        syncComments();

        const observer = () => {
            syncComments();
        };

        yCommentsMap.observe(observer);

        return () => {
            yCommentsMap.unobserve(observer);
        };
    }, [yCommentsMap]);

    // Comment management functions
    const addComment = (commentText: string) => {
        if (!editor || !me) return;
        
        const { from, to } = editor.state.selection;
        if (from === to) return; // No selection

        const commentId = nanoid();
        const userInfo = me.info as any;
        const userName = userInfo?.name || 'Anonymous';
        const userAvatar = userInfo?.avatar;
        const userColor = userInfo?.color || '#fef08a';

        // Add comment mark to selected text
        (editor.chain().focus() as any).setComment({
            commentId,
            userId: me.id as string,
            userName,
            userColor,
        }).run();
        // Immediately collapse selection to avoid extending mark to new text
        editor.commands.setTextSelection(to);

        // Store comment thread in Yjs
        const thread: CommentThread = {
            id: commentId,
            text: commentText,
            userId: me.id as string,
            userName,
            userAvatar,
            userColor,
            timestamp: new Date().toISOString(),
            resolved: false,
            replies: [],
        };

        yCommentsMap.set(commentId, thread);
        setActiveCommentId(commentId);
    };

    const addReply = (commentId: string, replyText: string) => {
        if (!me) return;

        const thread = yCommentsMap.get(commentId);
        if (!thread) return;

        const userInfo = me.info as any;
        const reply = {
            id: nanoid(),
            text: replyText,
            userId: me.id as string,
            userName: userInfo?.name || 'Anonymous',
            userAvatar: userInfo?.avatar,
            timestamp: new Date().toISOString(),
        };

        const updatedThread = {
            ...thread,
            replies: [...thread.replies, reply],
        };

        yCommentsMap.set(commentId, updatedThread);
    };

    const toggleResolve = (commentId: string) => {
        const thread = yCommentsMap.get(commentId);
        if (!thread) return;

        yCommentsMap.set(commentId, {
            ...thread,
            resolved: !thread.resolved,
        });
    };

    const deleteComment = (commentId: string) => {
        yCommentsMap.delete(commentId);
        
        // Remove comment marks from editor
        if (editor) {
            editor.state.doc.descendants((node, pos) => {
                if (node.marks) {
                    node.marks.forEach(mark => {
                        if (mark.type.name === 'comment' && mark.attrs.commentId === commentId) {
                            (editor.chain().focus().setTextSelection({ from: pos, to: pos + node.nodeSize }) as any).unsetComment().run();
                        }
                    });
                }
            });
        }
    };


    const hasSelection = editor && !editor.state.selection.empty;

    return (
        <div className="lb-tiptap flex h-full w-full flex-col">
            {editor && editor.view && !editor.isDestroyed && (
              <div className="sticky top-0 z-10 flex h-10 w-full items-center gap-1.5 overflow-x-auto overflow-y-visible whitespace-nowrap bg-cyan-600 px-2 text-white rounded-t-3xl border-b border-cyan-700">
                <button title="Undo" className="rounded-md p-2 hover:bg-cyan-700" onClick={() => editor.chain().focus().undo().run()}>
                  <Undo2Icon className="h-4 w-4" />
                </button>
                <button title="Redo" className="rounded-md p-2 hover:bg-cyan-700" onClick={() => editor.chain().focus().redo().run()}>
                  <Redo2Icon className="h-4 w-4" />
                </button>
                <span className="mx-1 h-4 w-px bg-white/30" />
                {/* Headings dropdown */}
                <HeadingDropdown editor={editor} />
                <FontFamilyDropdown editor={editor} />
                <FontSizeDropdown editor={editor} />
                <span className="mx-1 h-4 w-px bg-white/30" />
                <button title="Bold" className={`rounded-md p-2 hover:bg-cyan-700 ${editor.isActive('bold') ? 'bg-cyan-700' : ''}`} onClick={() => editor.chain().focus().toggleBold().run()}>
                  <BoldIcon className="h-4 w-4" />
                </button>
                <button title="Italic" className={`rounded-md p-2 hover:bg-cyan-700 ${editor.isActive('italic') ? 'bg-cyan-700' : ''}`} onClick={() => editor.chain().focus().toggleItalic().run()}>
                  <ItalicIcon className="h-4 w-4" />
                </button>
                <button title="Underline" className={`rounded-md p-2 hover:bg-cyan-700 ${editor.isActive('underline') ? 'bg-cyan-700' : ''}`} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                  <UnderlineIcon className="h-4 w-4" />
                </button>
                <button title="Strike" className={`rounded-md p-2 hover:bg-cyan-700 ${editor.isActive('strike') ? 'bg-cyan-700' : ''}`} onClick={() => editor.chain().focus().toggleStrike().run()}>
                  <StrikethroughIcon className="h-4 w-4" />
                </button>
                <button title="Code" className={`rounded-md p-2 hover:bg-cyan-700 ${editor.isActive('code') ? 'bg-cyan-700' : ''}`} onClick={() => editor.chain().focus().toggleCode().run()}>
                  <CodeIcon className="h-4 w-4" />
                </button>
                <button
                  title="Link"
                  className={`rounded-md p-2 hover:bg-cyan-700 ${editor.isActive('link') ? 'bg-cyan-700' : ''}`}
                  onClick={() => {
                    if (editor.isActive('link')) {
                      editor.chain().focus().unsetLink().run();
                      return;
                    }
                    const url = window.prompt('Enter URL');
                    if (!url) return;
                    editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
                  }}
                >
                  <Link2Icon className="h-4 w-4" />
                </button>
                <span className="mx-1 h-4 w-px bg-white/30" />
                <button title="Bullet list" className={`rounded-md p-2 hover:bg-cyan-700 ${editor.isActive('bulletList') ? 'bg-cyan-700' : ''}`} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                  <ListIcon className="h-4 w-4" />
                </button>
                <button title="Ordered list" className={`rounded-md p-2 hover:bg-cyan-700 ${editor.isActive('orderedList') ? 'bg-cyan-700' : ''}`} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                  <ListOrderedIcon className="h-4 w-4" />
                </button>
                <button title="Blockquote" className={`rounded-md p-2 hover:bg-cyan-700 ${editor.isActive('blockquote') ? 'bg-cyan-700' : ''}`} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                  <QuoteIcon className="h-4 w-4" />
                </button>
                <HighlightDropdown editor={editor} />
                <TextColorDropdown editor={editor} />
                <span className="mx-1 h-4 w-px bg-white/30" />
                <button title="Align left" className={`rounded-md p-2 hover:bg-cyan-700 ${editor.isActive({ textAlign: 'left' }) ? 'bg-cyan-700' : ''}`} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
                  <AlignLeftIcon className="h-4 w-4" />
                </button>
                <button title="Align center" className={`rounded-md p-2 hover:bg-cyan-700 ${editor.isActive({ textAlign: 'center' }) ? 'bg-cyan-700' : ''}`} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
                  <AlignCenterIcon className="h-4 w-4" />
                </button>
                <button title="Align right" className={`rounded-md p-2 hover:bg-cyan-700 ${editor.isActive({ textAlign: 'right' }) ? 'bg-cyan-700' : ''}`} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
                  <AlignRightIcon className="h-4 w-4" />
                </button>
                <span className="mx-1 h-4 w-px bg-white/30" />
                <button 
                  title="Add Comment" 
                  className={`rounded-md p-2 hover:bg-cyan-700 ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''}`} 
                  disabled={!hasSelection}
                  onClick={() => {
                    if (hasSelection) {
                      const text = window.prompt('Enter your comment:');
                      if (text) addComment(text);
                    }
                  }}
                >
                  <MessageSquarePlusIcon className="h-4 w-4" />
                </button>
                <button 
                  title="Toggle Comments Sidebar" 
                  className={`rounded-md p-2 hover:bg-cyan-700 ${sidebarOpen ? 'bg-cyan-700' : ''}`} 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <MessageSquareIcon className="h-4 w-4" />
                </button>
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
            <div className="relative flex h-full w-full">
                <div className={`relative flex-1 overflow-auto ${sidebarOpen ? 'mr-80' : ''}`}>
                <EditorContent editor={editor} className="h-full w-full bg-card text-foreground p-6" />
                </div>
                {sidebarOpen && (
                    <CommentSidebar 
                        comments={comments}
                        activeCommentId={activeCommentId}
                        onAddReply={addReply}
                        onToggleResolve={toggleResolve}
                        onDelete={deleteComment}
                        onCommentClick={(commentId) => {
                            setActiveCommentId(commentId);
                            // Find and highlight the comment in the editor
                            if (editor) {
                                let found = false;
                                editor.state.doc.descendants((node, pos) => {
                                    if (found) return false;
                                    if (node.marks) {
                                        node.marks.forEach(mark => {
                                            if (mark.type.name === 'comment' && mark.attrs.commentId === commentId) {
                                                editor.commands.setTextSelection({ from: pos, to: pos + node.nodeSize });
                                                found = true;
                                            }
                                        });
                                    }
                                    return !found;
                                });
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
};

// small dropdown helpers
const HeadingDropdown = ({ editor }: { editor: any }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button title="Heading" className="rounded-md p-2 hover:bg-cyan-700">
        <span className="text-xs">Text</span>
      </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-[100] min-w-[160px] bg-cyan-600 text-white border border-cyan-700"
        sideOffset={6} align="start">
        <DropdownMenuItem onClick={() => editor.chain().focus().liftListItem('listItem').setParagraph().setMark('textStyle',{ fontSize: null }).removeEmptyTextStyle().run()} onSelect={(e) => { e.preventDefault(); editor.chain().focus().liftListItem('listItem').setParagraph().setMark('textStyle',{ fontSize: null }).removeEmptyTextStyle().run(); }} className={editor.isActive('paragraph') ? 'bg-cyan-700 focus:bg-cyan-700' : ''}>Paragraph</DropdownMenuItem>
        <DropdownMenuItem onClick={() => editor.chain().focus().liftListItem('listItem').setHeading({ level: 1 }).setMark('textStyle',{ fontSize: null }).removeEmptyTextStyle().run()} onSelect={(e) => { e.preventDefault(); editor.chain().focus().liftListItem('listItem').setHeading({ level: 1 }).setMark('textStyle',{ fontSize: null }).removeEmptyTextStyle().run(); }} className={editor.isActive('heading', { level: 1 }) ? 'bg-cyan-700 focus:bg-cyan-700' : ''}>Heading 1</DropdownMenuItem>
        <DropdownMenuItem onClick={() => editor.chain().focus().liftListItem('listItem').setHeading({ level: 2 }).setMark('textStyle',{ fontSize: null }).removeEmptyTextStyle().run()} onSelect={(e) => { e.preventDefault(); editor.chain().focus().liftListItem('listItem').setHeading({ level: 2 }).setMark('textStyle',{ fontSize: null }).removeEmptyTextStyle().run(); }} className={editor.isActive('heading', { level: 2 }) ? 'bg-cyan-700 focus:bg-cyan-700' : ''}>Heading 2</DropdownMenuItem>
        <DropdownMenuItem onClick={() => editor.chain().focus().liftListItem('listItem').setHeading({ level: 3 }).setMark('textStyle',{ fontSize: null }).removeEmptyTextStyle().run()} onSelect={(e) => { e.preventDefault(); editor.chain().focus().liftListItem('listItem').setHeading({ level: 3 }).setMark('textStyle',{ fontSize: null }).removeEmptyTextStyle().run(); }} className={editor.isActive('heading', { level: 3 }) ? 'bg-cyan-700 focus:bg-cyan-700' : ''}>Heading 3</DropdownMenuItem>
        <DropdownMenuItem onClick={() => editor.chain().focus().liftListItem('listItem').setHeading({ level: 4 }).setMark('textStyle',{ fontSize: null }).removeEmptyTextStyle().run()} onSelect={(e) => { e.preventDefault(); editor.chain().focus().liftListItem('listItem').setHeading({ level: 4 }).setMark('textStyle',{ fontSize: null }).removeEmptyTextStyle().run(); }} className={editor.isActive('heading', { level: 4 }) ? 'bg-cyan-700 focus:bg-cyan-700' : ''}>Heading 4</DropdownMenuItem>
        <DropdownMenuItem onClick={() => editor.chain().focus().liftListItem('listItem').setHeading({ level: 5 }).setMark('textStyle',{ fontSize: null }).removeEmptyTextStyle().run()} onSelect={(e) => { e.preventDefault(); editor.chain().focus().liftListItem('listItem').setHeading({ level: 5 }).setMark('textStyle',{ fontSize: null }).removeEmptyTextStyle().run(); }} className={editor.isActive('heading', { level: 5 }) ? 'bg-cyan-700 focus:bg-cyan-700' : ''}>Heading 5</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const FontFamilyDropdown = ({ editor }: { editor: any }) => {
  const fonts = [
    { name: 'Default', value: null },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Times New Roman', value: '"Times New Roman", serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Courier New', value: '"Courier New", monospace' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'System UI', value: 'system-ui, sans-serif' },
  ];

  const getCurrentFont = () => {
    try {
      const attrs = editor.getAttributes('textStyle');
      const fontFamily = attrs.fontFamily;
      return fonts.find(f => f.value === fontFamily)?.name || 'Default';
    } catch {
      return 'Default';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button title="Font Family" className="rounded-md p-2 hover:bg-cyan-700">
          <span className="text-xs">{getCurrentFont()}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-[100] min-w-[200px] max-h-64 overflow-y-auto bg-cyan-600 text-white border border-cyan-700"
        sideOffset={6} align="start">
        <DropdownMenuItem onSelect={() => (editor.chain().focus() as any).unsetFontFamily().run()} className={!editor.getAttributes('textStyle')?.fontFamily ? 'bg-cyan-700 focus:bg-cyan-700' : ''}>Default</DropdownMenuItem>
        {fonts.slice(1).map(font => (
          <DropdownMenuItem key={font.name}
            onSelect={() => (editor.chain().focus() as any).setFontFamily(font.value as string).run()}
            style={{ fontFamily: font.value || undefined }}>
            {font.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const FontSizeDropdown = ({ editor }: { editor: any }) => {
  const sizes = ['8px', '10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '64px'];

  const getCurrentSize = () => {
    try {
      const attrs = editor.getAttributes('textStyle');
      return attrs.fontSize || 'Default';
    } catch {
      return 'Default';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button title="Font Size" className="rounded-md p-2 hover:bg-cyan-700">
          <span className="text-xs">{getCurrentSize()}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-[100] min-w-[140px] max-h-64 overflow-y-auto bg-cyan-600 text-white border border-cyan-700"
        sideOffset={6} align="start">
        <DropdownMenuItem onSelect={() => (editor.chain().focus() as any).unsetFontSize().run()}>Default</DropdownMenuItem>
        {sizes.map(size => (
          <DropdownMenuItem key={size}
            onSelect={() => (editor.chain().focus() as any).setFontSize(size).run()}
            style={{ fontSize: size }}>
            {size}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


const TextColorDropdown = ({ editor }: { editor: any }) => {
  const palette = [
    '#000000','#111827','#6B7280','#9CA3AF','#D1D5DB','#FFFFFF',
    '#EF4444','#F59E0B','#FBBF24','#10B981','#3B82F6','#6366F1','#8B5CF6'
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button title="Text Color" className="rounded-md p-2 hover:bg-cyan-700">
          <span className="text-[10px]">A</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-[100] p-2 bg-cyan-600 text-white border border-cyan-700" sideOffset={6} align="start">
        <div className="grid grid-cols-7 gap-2">
          {palette.map((hex) => (
            <button
              key={hex}
              className="h-5 w-5 rounded-sm border border-white/20"
              style={{ backgroundColor: hex }}
              onClick={(e) => {
                e.preventDefault();
                editor.chain().focus().setColor(hex).run();
              }}
            />
          ))}
          <label className="col-span-7 flex items-center gap-2 text-xs">
            Custom
            <input
              type="color"
              className="h-5 w-10 cursor-pointer rounded border border-white/20 bg-transparent"
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            />
          </label>
        </div>
        <div className="mt-2 flex items-center justify-end">
          <button className="rounded bg-cyan-700 px-2 py-1 text-xs" onClick={() => editor.chain().focus().unsetColor().run()}>
            Clear
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const HighlightDropdown = ({ editor }: { editor: any }) => {
  const swatches = ['#fef08a','#fde68a','#fca5a5','#93c5fd','#bbf7d0','#f9a8d4'];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button title="Highlight" className="rounded-md p-2 hover:bg-cyan-700">
          <span className="text-[10px]">HL</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-[100] p-2 bg-cyan-600 text-white border border-cyan-700" sideOffset={6} align="start">
        <div className="flex flex-wrap gap-2">
          {swatches.map((c) => (
            <button key={c} className="h-5 w-5 rounded-sm border border-white/20" style={{ backgroundColor: c }} onClick={(e) => { e.preventDefault(); editor.chain().focus().setHighlight({ color: c }).run(); }} />
          ))}
          <button className="rounded bg-cyan-700 px-2 py-1 text-xs" onClick={() => editor.chain().focus().unsetHighlight().run()}>
            Clear
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};



type TiptapPrimitiveProps = TiptapNodeProps & {
  title: string;
};

export const TiptapPrimitive = (props: TiptapPrimitiveProps) => {
  const { doc, provider } = useYDoc();
  const reactFlow = useReactFlow();
  
  // Allow per-node overrides via data.width/height
  const width = (props.data as any)?.width ?? 1080;
  const height = (props.data as any)?.height ?? 1280;
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
      className="min-h-[820px]"
    >
      {/* "Fill Frame" Pattern: Direct child has h-full */}
      <div className="flex h-full flex-col gap-3 p-3">
        {/* Header removed per request */}

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
