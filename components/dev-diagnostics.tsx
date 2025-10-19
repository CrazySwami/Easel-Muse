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
      // eslint-disable-next-line no-console
      console.info('[diags] DevDiagnostics mounted, enabled =', on);
    } catch {}
  }, []);

  if (!enabled) return null;
  // Badge removed as React Scan provides its own UI
  return null;
};

export default DevDiagnostics;


