'use client';

import { useMemo, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

type FeedbackItem = {
  id: string;
  kind: 'feature' | 'bug';
  email?: string | null;
  message: string;
  imageUrl?: string | null;
  status: 'new' | 'in_progress' | 'resolved';
  createdAt: string | Date;
};

export default function AdminFeedbackKanban({ initial }: { initial: FeedbackItem[] }) {
  const [items, setItems] = useState<FeedbackItem[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<FeedbackItem['status'] | null>(null);

  const grouped = useMemo(() => ({
    new: items.filter((i) => i.status === 'new'),
    in_progress: items.filter((i) => i.status === 'in_progress'),
    resolved: items.filter((i) => i.status === 'resolved'),
  }), [items]);

  const updateStatus = async (id: string, next: FeedbackItem['status']) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: next } : i));
    try {
      await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
    } catch {}
  };

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDragId(id);
  };

  const onDropColumn = (e: React.DragEvent<HTMLDivElement>, to: FeedbackItem['status']) => {
    const id = e.dataTransfer.getData('text/plain');
    if (id) updateStatus(id, to);
    setOverCol(null);
    setDragId(null);
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch(`/api/feedback/${id}`, { method: 'DELETE' });
    } catch {}
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Feature Requests & Bugs</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(['new','in_progress','resolved'] as const).map((col) => (
          <div
            key={col}
            className={`rounded-md border shadow-sm ${overCol === col ? 'border-green-600 ring-2 ring-green-500/40 shadow-md' : 'border-muted'} bg-card`}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col); }}
            onDrop={(e) => onDropColumn(e, col)}
          >
            <div className="border-b p-3 font-medium capitalize">{col.replace('_',' ')}</div>
            <div className="p-3 space-y-3 min-h-[180px]">
              {grouped[col].map((f) => (
                <div
                  key={f.id}
                  className={`rounded-md border p-3 bg-background cursor-grab ${dragId === f.id ? 'opacity-80 scale-[0.98] shadow-lg' : ''}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, f.id)}
                  onDragEnd={() => { setDragId(null); setOverCol(null); }}
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex gap-2 items-center">
                      <span>{new Date(f.createdAt as any).toLocaleString()}</span>
                      {f.email && <span>{f.email}</span>}
                    </div>
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
                        {f.status !== 'resolved' && (
                          <DropdownMenuItem onClick={() => updateStatus(f.id, 'resolved')}>Mark Resolved</DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-600" onClick={() => remove(f.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{f.message}</p>
                  {f.imageUrl && (
                    <div className="mt-2">
                      <img src={f.imageUrl} alt="attachment" className="max-h-48 w-auto rounded" />
                    </div>
                  )}
                  <div className="mt-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium text-white ${f.kind === 'bug' ? 'bg-orange-500' : 'bg-blue-600'}`}>
                      {f.kind}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


