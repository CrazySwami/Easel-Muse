'use client';

import { useEffect, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

export default function ImageModal({ editable }: { editable?: boolean }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ authorName?: string|null; authorEmail?: string|null; authorAvatar?: string|null; kind?: string; createdAt?: string; message?: string; title?: string } | null>(null);

  useEffect(() => {
    const onOpen = (e: any) => {
      setId(e.detail?.id ?? null);
      setUrl(e.detail?.url ?? null);
      setMeta(e.detail?.meta ?? null);
      setOpen(true);
    };
    window.addEventListener('roadmap:image:open', onOpen as any);
    return () => window.removeEventListener('roadmap:image:open', onOpen as any);
  }, []);

  const move = async (status: 'new'|'in_progress'|'on_hold'|'resolved') => {
    if (!editable || !id) return;
    await fetch(`/api/feedback/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
      <div className={`w-full rounded-xl border bg-card p-4 max-w-xl`} onClick={(e) => e.stopPropagation()}>
        <div className={`h-1 w-full rounded ${meta?.kind === 'bug' ? 'bg-orange-500' : 'bg-blue-600'}`} />
        <div className="flex items-center mt-3">
          <div className="text-primary text-lg font-semibold truncate flex-1">{meta?.title || 'Untitled'}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {meta?.authorEmail && <div className="hidden sm:block text-right">
              <div className="text-foreground">{meta?.authorName || 'Unknown user'}</div>
              <div>{meta?.authorEmail || ''}</div>
            </div>}
            {meta?.authorAvatar ? (
              <img src={meta.authorAvatar} alt="avatar" className="h-7 w-7 rounded-full" />
            ) : (
              <div className="h-7 w-7 rounded-full bg-muted" />
            )}
          </div>
          {editable && (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded p-1 hover:bg-muted" aria-label="Change status"><MoreVertical size={16} /></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => move('new')}>Move to New</DropdownMenuItem>
                <DropdownMenuItem onClick={() => move('in_progress')}>Move to In progress</DropdownMenuItem>
                <DropdownMenuItem onClick={() => move('on_hold')}>Move to On hold</DropdownMenuItem>
                <DropdownMenuItem onClick={() => move('resolved')}>Mark Resolved</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1"><span className="text-primary font-medium">Date</span>: {meta?.createdAt ? new Date(meta.createdAt).toLocaleString() : 'Unknown'}</div>
        <div className="mb-3 mt-2 max-h-[40vh] overflow-auto whitespace-pre-wrap text-sm"><span className="text-primary font-medium">Description</span>: {meta?.message || 'No description provided.'}</div>
        {url && (
          <div className="relative group rounded-xl ring-2 ring-primary p-1 bg-background">
            <img src={url} alt="preview" className="w-full h-auto max-h-[40vh] rounded-lg object-contain" />
            <button
              className="absolute top-2 right-2 hidden group-hover:inline-flex rounded bg-primary px-2 py-1 text-primary-foreground text-xs"
              onClick={() => {
                const w = window.open(url, '_blank'); w?.focus();
              }}
            >
              View full size
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


