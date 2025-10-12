'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckIcon, PencilIcon, XIcon } from 'lucide-react';
import { useState } from 'react';

type QueryListProps = {
  queries: string[];
  onChange: (next: string[]) => void;
  selectedIndex?: number;
  onSelect?: (i: number) => void;
  onAdd?: () => void;
  onRun?: () => void;
  stickyFooter?: boolean;
  statuses?: Array<'idle'|'running'|'done'|'error'>;
  running?: boolean;
};

export function QueryList({ queries, onChange, selectedIndex = 0, onSelect, onAdd, onRun, stickyFooter = true, statuses = [], running = false }: QueryListProps) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="text-xs text-muted-foreground">Batch queries</div>
      <div className="relative min-h-0 flex-1 overflow-auto pb-24">
        <div className="space-y-2">
          {queries.map((q, idx) => (
            <div key={idx} className="group flex items-center gap-2">
            <button
              onClick={() => onSelect?.(idx)}
              className={`shrink-0 rounded border px-2 py-1 text-xs transition-colors duration-200 ${(() => {
                const s = statuses[idx];
                if (s === 'running') return 'bg-emerald-100 border-emerald-500 text-emerald-800';
                if (s === 'done') return 'bg-emerald-600 border-emerald-600 text-white';
                if (s === 'error') return 'bg-red-600 border-red-600 text-white';
                return selectedIndex===idx ? 'bg-primary/10 border-primary' : 'border-border';
              })()}`}
            >{idx+1}</button>
            {editIndex === idx ? (
              <Input
                autoFocus
                className="flex-1"
                value={q}
                onChange={(e) => { const next = [...queries]; next[idx] = e.target.value; onChange(next); }}
                onBlur={() => setEditIndex(null)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditIndex(null); }}
              />
            ) : (
              <div
                onClick={() => { onSelect?.(idx); setEditIndex(idx); }}
                className="flex-1 truncate rounded border bg-card/60 px-2 py-1 text-sm hover:bg-muted/50 cursor-text"
                title={q}
              >{q || `Query #${idx+1}`}</div>
            )}
            <Button variant="ghost" size="icon" className="invisible group-hover:visible" onClick={() => onChange(queries.filter((_,i)=>i!==idx))}><XIcon className="h-4 w-4"/></Button>
            </div>
          ))}
        </div>
      </div>
      {stickyFooter && (
        <div className="absolute bottom-2 right-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onAdd}>+ Add</Button>
            <Button size="sm" onClick={onRun} disabled={running}><CheckIcon className="mr-1 h-3 w-3"/>{running ? 'Running…' : 'Run Batch'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}


