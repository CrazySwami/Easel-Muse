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
};

export function QueryList({ queries, onChange, selectedIndex = 0, onSelect, onAdd, onRun, stickyFooter = true }: QueryListProps) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  return (
    <div className="space-y-2 min-h-0">
      <div className="text-xs text-muted-foreground">Batch queries</div>
      <div className="space-y-2 pb-12">
        {queries.map((q, idx) => (
          <div key={idx} className="group flex items-center gap-2">
            <button
              onClick={() => onSelect?.(idx)}
              className={`shrink-0 rounded border px-2 py-1 text-xs ${selectedIndex===idx ? 'bg-primary/10 border-primary' : 'border-border'}`}
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
      <div className={`flex items-center justify-between ${stickyFooter ? 'sticky bottom-0 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-t pt-2 pb-2' : 'pt-2'}`}>
        <Button variant="outline" size="sm" onClick={onAdd}>+ Add</Button>
        <Button size="sm" onClick={onRun}><CheckIcon className="mr-1 h-3 w-3"/>Run Batch</Button>
      </div>
    </div>
  );
}


