'use client';

import { QueryList } from '@/components/ui/batch/query-list';
import { Button } from '@/components/ui/button';
import { CheckIcon } from 'lucide-react';

type QueryColumnProps = {
  queries: string[];
  onChange: (next: string[]) => void;
  selectedIndex?: number;
  onSelect?: (i: number) => void;
  onAdd: () => void;
  onRun: () => void;
};

export function QueryColumn({ queries, onChange, selectedIndex = 0, onSelect, onAdd, onRun }: QueryColumnProps) {
  return (
    <div className="relative h-full min-h-0">
      <div className="absolute inset-0 flex min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-auto nowheel nodrag nopan" onPointerDown={(e)=> e.stopPropagation()}>
          <QueryList
            queries={queries}
            onChange={onChange}
            selectedIndex={selectedIndex}
            onSelect={onSelect}
            onAdd={onAdd}
            onRun={onRun}
            stickyFooter={false}
          />
        </div>
        <div className="absolute bottom-2 right-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onAdd}>+ Add</Button>
            <Button size="sm" onClick={onRun}><CheckIcon className="mr-1 h-3 w-3"/>Run Batch</Button>
          </div>
        </div>
      </div>
    </div>
  );
}


