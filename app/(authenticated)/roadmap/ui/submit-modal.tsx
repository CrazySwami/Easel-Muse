'use client';

import { useState } from 'react';
import FeedbackClient from '../../feedback/client';

export default function SubmitModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-lg"
      >
        Submit feedback
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-xl rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Submit feedback</h2>
              <button className="text-muted-foreground" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="mt-4">
              <FeedbackClient onSubmitted={() => {
                // Refresh the page so the new item appears on the board
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  // Toggle a cache-busting param to force server re-render
                  url.searchParams.set('t', Date.now().toString());
                  window.location.href = url.toString();
                }
              }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}


