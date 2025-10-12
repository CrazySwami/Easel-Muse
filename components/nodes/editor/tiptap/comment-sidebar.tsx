'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { CheckIcon, MessageSquareIcon, Trash2Icon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

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

type CommentSidebarProps = {
  comments: Record<string, CommentThread>;
  activeCommentId: string | null;
  onAddReply: (commentId: string, text: string) => void;
  onToggleResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onCommentClick: (commentId: string) => void;
};

export const CommentSidebar = ({
  comments,
  activeCommentId,
  onAddReply,
  onToggleResolve,
  onDelete,
  onCommentClick,
}: CommentSidebarProps) => {
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'unresolved'>('all');

  const filteredComments = Object.values(comments).filter(comment => {
    if (filter === 'unresolved') return !comment.resolved;
    return true;
  });

  const handleAddReply = (commentId: string) => {
    const text = replyTexts[commentId];
    if (text && text.trim()) {
      onAddReply(commentId, text.trim());
      setReplyTexts({ ...replyTexts, [commentId]: '' });
    }
  };

  return (
    <div
      className="absolute right-0 w-80 border-l border-border shadow-lg z-10 bg-white/90 dark:bg-neutral-900/90"
      style={{ top: 44, height: 'calc(100% - 44px)' }}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border p-4">
          <h3 className="mb-2 text-lg font-semibold">Comments</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className="flex-1"
            >
              All ({Object.keys(comments).length})
            </Button>
            <Button
              size="sm"
              variant={filter === 'unresolved' ? 'default' : 'outline'}
              onClick={() => setFilter('unresolved')}
              className="flex-1"
            >
              Unresolved ({Object.values(comments).filter(c => !c.resolved).length})
            </Button>
          </div>
        </div>

        {/* Comments List */}
        <ScrollArea className="flex-1 p-4">
          {filteredComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <MessageSquareIcon className="mb-2 h-12 w-12" />
              <p>No comments yet</p>
              <p className="text-xs">Select text and click the comment button to add one</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredComments.map(comment => (
                <div
                  key={comment.id}
                  className={`rounded-lg border p-3 ${
                    activeCommentId === comment.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  } ${comment.resolved ? 'opacity-60' : ''}`}
                  onClick={() => onCommentClick(comment.id)}
                >
                  {/* Comment Header */}
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {comment.userAvatar ? (
                        <img
                          src={comment.userAvatar}
                          alt={comment.userName}
                          className="h-6 w-6 rounded-full"
                        />
                      ) : (
                        <div
                          className="h-6 w-6 rounded-full"
                          style={{ backgroundColor: comment.userColor || '#06f' }}
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium">{comment.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleResolve(comment.id);
                        }}
                        title={comment.resolved ? 'Unresolve' : 'Resolve'}
                      >
                        {comment.resolved ? (
                          <XIcon className="h-3 w-3" />
                        ) : (
                          <CheckIcon className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(comment.id);
                        }}
                        title="Delete"
                      >
                        <Trash2Icon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Comment Text */}
                  <p className="mb-2 text-sm">{comment.text}</p>

                  {/* Replies */}
                  {comment.replies.length > 0 && (
                    <div className="ml-4 mt-2 space-y-2 border-l-2 border-border pl-3">
                      {comment.replies.map(reply => (
                        <div key={reply.id} className="text-sm">
                          <div className="flex items-center gap-2">
                            {reply.userAvatar ? (
                              <img
                                src={reply.userAvatar}
                                alt={reply.userName}
                                className="h-4 w-4 rounded-full"
                              />
                            ) : (
                              <div className="h-4 w-4 rounded-full bg-muted" />
                            )}
                            <p className="font-medium">{reply.userName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(reply.timestamp), { addSuffix: true })}
                            </p>
                          </div>
                          <p className="mt-1 text-sm">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input */}
                  {!comment.resolved && (
                    <div className="mt-2 flex gap-2">
                      <Input
                        placeholder="Add reply..."
                        value={replyTexts[comment.id] || ''}
                        onChange={(e) =>
                          setReplyTexts({ ...replyTexts, [comment.id]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddReply(comment.id);
                          }
                        }}
                        className="h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddReply(comment.id)}
                        disabled={!replyTexts[comment.id]?.trim()}
                        className="h-8"
                      >
                        Reply
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

