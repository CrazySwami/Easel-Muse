'use client';

import { useMemo, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { List, LayoutGrid } from 'lucide-react';

export type RoadmapItem = {
  id: string;
  kind: 'feature' | 'bug';
  email?: string | null;
  title?: string | null;
  message: string;
  imageUrl?: string | null;
  status: 'new' | 'in_progress' | 'on_hold' | 'resolved';
  createdAt: string | Date;
  authorName?: string | null;
  authorEmail?: string | null;
  authorAvatar?: string | null;
};

type RoadmapBoardProps = {
  items: RoadmapItem[];
  editable?: boolean;
  compactImages?: boolean; // when true, show a small image indicator instead of full preview
};

export function RoadmapBoard({ items: initial, editable = false, compactImages = true }: RoadmapBoardProps) {
  const [items, setItems] = useState<RoadmapItem[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<RoadmapItem['status'] | null>(null);
  const [showImages, setShowImages] = useState<boolean>(!compactImages);
  const [kindFilter, setKindFilter] = useState<'all'|'feature'|'bug'>('all');

  const grouped = useMemo(() => ({
    new: items.filter((i) => i.status === 'new'),
    in_progress: items.filter((i) => i.status === 'in_progress'),
    on_hold: items.filter((i) => i.status === 'on_hold'),
    resolved: items.filter((i) => i.status === 'resolved'),
  }), [items]);

  const updateStatus = async (id: string, next: RoadmapItem['status']) => {
    if (!editable) return;
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: next } : i));
    try {
      await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
    } catch {}
  };

  const remove = async (id: string) => {
    if (!editable) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch(`/api/feedback/${id}`, { method: 'DELETE' });
    } catch {}
  };

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (!editable) return;
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDragId(id);
  };

  const onDropColumn = (e: React.DragEvent<HTMLDivElement>, to: RoadmapItem['status']) => {
    if (!editable) return;
    const id = e.dataTransfer.getData('text/plain');
    if (id) updateStatus(id, to);
    setOverCol(null);
    setDragId(null);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <button className={`rounded border px-2 py-1 ${kindFilter==='all' ? 'bg-muted' : ''}`} onClick={() => setKindFilter('all')}>All</button>
          <button className={`rounded border px-2 py-1 ${kindFilter==='feature' ? 'bg-muted' : ''}`} onClick={() => setKindFilter('feature')}>Features</button>
          <button className={`rounded border px-2 py-1 ${kindFilter==='bug' ? 'bg-muted' : ''}`} onClick={() => setKindFilter('bug')}>Bugs</button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-pressed={!showImages}
            onClick={() => setShowImages(false)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded border ${!showImages ? 'border-primary text-primary bg-primary/10' : 'text-muted-foreground'}`}
            title="Compact view"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            aria-pressed={showImages}
            onClick={() => setShowImages(true)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded border ${showImages ? 'border-primary text-primary bg-primary/10' : 'text-muted-foreground'}`}
            title="List view"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      {(['new','in_progress','on_hold','resolved'] as const).map((col) => (
        <div
          key={col}
          className={`rounded-md border shadow-sm bg-card ${editable && overCol === col ? 'border-primary ring-2 ring-primary/40 shadow-md' : ''}`}
          onDragOver={(e) => { if (editable) { e.preventDefault(); setOverCol(col); } }}
          onDrop={(e) => onDropColumn(e, col)}
        >
          <div className="border-b p-3 font-medium capitalize text-primary">
            {col.replace('_',' ')}
          </div>
          <div className="p-3 space-y-3 min-h-[180px] max-h-[65vh] overflow-auto">
            {grouped[col]
              .filter((f) => kindFilter === 'all' || f.kind === kindFilter)
              .map((f) => (
              <div
                key={f.id}
                className={`rounded-md border bg-card dark:bg-background ${editable ? 'cursor-grab' : 'cursor-pointer'} ${dragId === f.id ? 'opacity-80 scale-[0.98] shadow-lg' : ''} min-h-[160px] flex flex-col`}
                draggable={editable}
                onDragStart={(e) => onDragStart(e, f.id)}
                onDragEnd={() => { setDragId(null); setOverCol(null); }}
                onClick={() => {
                  const evt = new CustomEvent('roadmap:image:open', { detail: { id: f.id, url: f.imageUrl, meta: {
                    authorName: f.authorName,
                    authorEmail: f.authorEmail,
                    authorAvatar: f.authorAvatar,
                    kind: f.kind,
                    createdAt: f.createdAt as any,
                    message: f.message,
                    title: f.title,
                  } }});
                  window.dispatchEvent(evt);
                }}
              >
                <div className={`h-1 w-full rounded-t ${f.kind === 'bug' ? 'bg-orange-500' : 'bg-blue-600'}`} />
                <div className="px-2 pt-2 pb-0 md:pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-primary font-semibold truncate">{f.title || 'Untitled'}</div>
                    <span className={`ml-2 inline-block rounded px-2 py-0.5 text-[11px] font-medium text-white ${f.kind === 'bug' ? 'bg-orange-500' : 'bg-blue-600'}`}>
                      {f.kind}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                  <div className="flex gap-2 items-center">
                    <span className="inline-flex items-center gap-1"><span className="text-primary font-medium">Date</span>: {new Date(f.createdAt as any).toLocaleString()}</span>
                  </div>
                  {editable && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="rounded p-1 hover:bg-muted" aria-label="Actions">
                        <MoreVertical size={16} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {f.status !== 'new' && (
                          <DropdownMenuItem onClick={() => updateStatus(f.id, 'new')}>Move to New</DropdownMenuItem>
                        )}
                        {f.status !== 'in_progress' && (
                          <DropdownMenuItem onClick={() => updateStatus(f.id, 'in_progress')}>Move to In progress</DropdownMenuItem>
                        )}
                        {f.status !== 'on_hold' && (
                          <DropdownMenuItem onClick={() => updateStatus(f.id, 'on_hold')}>Move to On hold</DropdownMenuItem>
                        )}
                        {f.status !== 'resolved' && (
                          <DropdownMenuItem onClick={() => updateStatus(f.id, 'resolved')}>Mark Resolved</DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-600" onClick={() => remove(f.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {(() => { const showImg = Boolean(f.imageUrl && showImages); return (
                <div className={`px-2 ${showImg ? '' : 'pb-2'}`}>
                  <div className="my-[6px] flex items-center gap-2 text-xs text-muted-foreground">
                    {f.authorAvatar ? (
                      <img src={f.authorAvatar} alt="avatar" className="h-5 w-5 rounded-full" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-muted" />
                    )}
                    <span className="inline-flex items-center gap-1"><span className="text-primary font-medium">User</span>: {f.authorName || 'Unknown user'}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2 as any, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
                    <span className="text-primary font-medium">Description</span>: {f.message || 'No description provided.'}
                  </p>
                </div> )})()}
                {f.imageUrl && (
                  <div className="mt-2 px-2 pb-2">
                    {!showImages ? null : (
                      <img src={f.imageUrl} alt="attachment" className="max-h-24 w-auto rounded cursor-pointer object-cover" onClick={() => {
                        const evt = new CustomEvent('roadmap:image:open', { detail: { id: f.id, url: f.imageUrl, meta: {
                          authorName: f.authorName,
                          authorEmail: f.authorEmail,
                          authorAvatar: f.authorAvatar,
                          kind: f.kind,
                          createdAt: f.createdAt as any,
                          message: f.message,
                          title: f.title,
                        } }});
                        window.dispatchEvent(evt);
                      }} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}


