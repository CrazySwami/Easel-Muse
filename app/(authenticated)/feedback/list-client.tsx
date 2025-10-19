'use client';

type Item = {
  id: string;
  kind: 'feature' | 'bug';
  message: string;
  imageUrl?: string | null;
  status: 'new' | 'in_progress' | 'resolved';
  createdAt: string | Date;
};

export default function FeedbackList({ items, onSubmitScrollId }: { items: Item[]; onSubmitScrollId?: string }) {
  const scrollToForm = () => {
    if (!onSubmitScrollId) return;
    const el = document.getElementById(onSubmitScrollId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(['new','in_progress','resolved'] as const).map((col) => (
          <div
            key={col}
            className="rounded-md border shadow-sm bg-card"
          >
            <div className="border-b p-3 font-medium capitalize text-emerald-700 dark:text-emerald-400">
              {col.replace('_',' ')}
            </div>
            <div className="p-3 space-y-3">
              {items.filter((i) => i.status === col).map((f) => (
                <div key={f.id} className="rounded-md border p-3 bg-background">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex gap-2 items-center">
                      <span>{new Date(f.createdAt as any).toLocaleString()}</span>
                    </div>
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
      <button onClick={scrollToForm} className="fixed bottom-6 right-6 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-lg">
        Submit feedback
      </button>
    </div>
  );
}


