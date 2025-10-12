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
};

export function QueryList({ queries, onChange, selectedIndex = 0, onSelect, onAdd, onRun }: QueryListProps) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Batch queries</div>
        <div className="invisible group-hover:visible flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setEditing((e) => !e)}>
            <PencilIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {queries.map((q, idx) => (
          <div key={idx} className="group flex items-center gap-2">
            <button
              onClick={() => onSelect?.(idx)}
              className={`shrink-0 rounded border px-2 py-1 text-xs ${selectedIndex===idx ? 'bg-primary/10 border-primary' : 'border-border'}`}
            >{idx+1}</button>
            {editing ? (
              <Input
                className="flex-1"
                value={q}
                onChange={(e) => {
                  const next = [...queries]; next[idx] = e.target.value; onChange(next);
                }}
              />
            ) : (
              <div onClick={() => onSelect?.(idx)} className="flex-1 truncate rounded border bg-card/60 px-2 py-1 text-sm hover:bg-muted/50 cursor-pointer">{q || `Query #${idx+1}`}</div>
            )}
            <Button variant="ghost" size="icon" className="invisible group-hover:visible" onClick={() => onChange(queries.filter((_,i)=>i!==idx))}><XIcon className="h-4 w-4"/></Button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" onClick={onAdd}>+ Add</Button>
        <Button size="sm" onClick={onRun}><CheckIcon className="mr-1 h-3 w-3"/>Run Batch</Button>
      </div>
    </div>
  );
}


