'use client';

// Globally load development diagnostics when enabled
import '@/lib/dev-instrumentation';
import { useEffect, useState } from 'react';

const DevDiagnostics = () => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    try {
      const on = String(process.env.NEXT_PUBLIC_ENABLE_RENDER_DIAGS || '').toLowerCase() === '1';
      setEnabled(on);
    } catch {}
  }, []);

  if (!enabled) return null;
  return (
    <div
      style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 9999999 }}
      className="pointer-events-none select-none rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white shadow"
    >
      Diagnostics ON
    </div>
  );
};

export default DevDiagnostics;


