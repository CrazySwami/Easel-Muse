'use client';

import { useNodeOperations } from '@/providers/node-operations';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Panel, useReactFlow } from '@xyflow/react';

export const StressPanel = () => {
  const { addNode } = useNodeOperations();
  const { addEdges, getNodes, getEdges, setCenter, getViewport } = useReactFlow();

  const [count, setCount] = useState(200);
  const [running, setRunning] = useState(false);
  const [fps, setFps] = useState(0);
  const [longTasks, setLongTasks] = useState(0);
  const [mem, setMem] = useState<string | null>(null);
  const [eventLag, setEventLag] = useState(0);
  const [lastAddMs, setLastAddMs] = useState<number | null>(null);
  const [lastGenMs, setLastGenMs] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [connectChunk, setConnectChunk] = useState(200);
  // bulk model selection removed per request

  // FPS meter
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const loop = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = now;
        // memory (experimental)
        const perfMem: any = (performance as any).memory;
        if (perfMem?.usedJSHeapSize && perfMem?.jsHeapSizeLimit) {
          const used = (perfMem.usedJSHeapSize / 1048576).toFixed(0);
          const limit = (perfMem.jsHeapSizeLimit / 1048576).toFixed(0);
          setMem(`${used} / ${limit} MB`);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Long task observer
  useEffect(() => {
    let obs: PerformanceObserver | null = null;
    try {
      obs = new PerformanceObserver((list) => {
        setLongTasks((n) => n + list.getEntries().length);
      });
      // @ts-ignore
      obs.observe({ entryTypes: ['longtask'] });
    } catch {}
    return () => obs?.disconnect();
  }, []);

  // Event loop lag (setInterval drift)
  useEffect(() => {
    let expected = performance.now() + 1000;
    const iv = setInterval(() => {
      const now = performance.now();
      const drift = Math.max(0, now - expected);
      setEventLag(Math.round(drift));
      expected = now + 1000;
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const addGrid = async (n: number) => {
    const t0 = performance.now();
    const viewport = getViewport();
    const centerX = -viewport.x / viewport.zoom + window.innerWidth / 2 / viewport.zoom;
    const centerY = -viewport.y / viewport.zoom + window.innerHeight / 2 / viewport.zoom;

    const cols = Math.ceil(Math.sqrt(n));
    const spacing = 240;
    const startX = centerX - ((cols - 1) * spacing) / 2;
    const startY = centerY - ((cols - 1) * spacing) / 2;

    let created = 0;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = startX + col * spacing;
      const y = startY + row * spacing;
      addNode('text', { position: { x, y }, data: { text: `Node ${i + 1}` } });
      created++;
      if (created % 100 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    setLastAddMs(Math.round(performance.now() - t0));
  };

  const addPairsAndConnect = async (n: number, chunkSize = 200) => {
    const idsA: string[] = [];
    const idsB: string[] = [];
    const spacing = 260;
    const cols = Math.ceil(Math.sqrt(n));
    const viewport = getViewport();
    const centerX = -viewport.x / viewport.zoom + window.innerWidth / 2 / viewport.zoom;
    const centerY = -viewport.y / viewport.zoom + window.innerHeight / 2 / viewport.zoom;
    const startX = centerX - ((cols - 1) * spacing) / 2;
    const startY = centerY - ((cols - 1) * spacing) / 2;

    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = startX + col * spacing;
      const y = startY + row * spacing;
      idsA.push(addNode('text', { position: { x, y }, data: { text: `Prompt ${i + 1}` } }));
      idsB.push(addNode('text', { position: { x: x + 360, y }, data: { instructions: 'Respond succinctly.' } }));
      if (i % 100 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    // Connect in batches to avoid massive synchronous updates that can trip the
    // renderer under heavy load.
    const edgesToAdd = idsA.map((src, i) => ({ id: `e-${src}-${idsB[i]}`, source: src, target: idsB[i], type: 'animated' }));
    for (let i = 0; i < edgesToAdd.length; i += chunkSize) {
      addEdges(edgesToAdd.slice(i, i + chunkSize));
      // Yield back to the browser to flush layout and avoid long tasks
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 0));
    }
  };

  const generateAllText = () => {
    setRunning(true);
    const t0 = performance.now();
    window.dispatchEvent(new CustomEvent('easel:generate-all'));
    // stop flag after 60s as a safety
    setTimeout(() => setRunning(false), 60000);
    setLastGenMs(Math.round(performance.now() - t0));
  };

  const clearGraph = () => {
    // Remove all nodes/edges by selecting empty array
    const nodes = getNodes();
    if (nodes.length === 0) return;
    // center back to origin for convenience
    setCenter(0, 0, { zoom: 0.5, duration: 300 });
    // Easiest: reload current project content through React Flow controls
    // but here we simply remove nodes by setting positions off-screen and dispatching deletion via keyboard is overkill.
    // Instead, guide: select all and press delete. We provide generation/creation focus here.
  };

  const stats = useMemo(() => {
    return {
      nodes: getNodes().length,
      edges: getEdges().length,
    };
  }, [getNodes, getEdges, fps, longTasks, running]);

  return (
    <Panel
      position="top-left"
      style={{ top: '50%', transform: 'translateY(-50%)' }}
      className="m-4 rounded-xl border bg-card/90 p-2 text-xs backdrop-blur-sm"
    >
      <div className="mb-2 flex flex-col items-start gap-1">
        <span className="font-medium">Stress</span>
        <span className="text-muted-foreground">fps {fps}{mem ? ` · ${mem}` : ''} · lag {eventLag}ms</span>
        <span className="text-muted-foreground">long {longTasks} · n{stats.nodes}/e{stats.edges}</span>
        <span className="text-muted-foreground">add{lastAddMs != null ? ` ${lastAddMs}ms` : ''} · gen{lastGenMs != null ? ` ${lastGenMs}ms` : ''}</span>
      </div>
      <div className="flex flex-col items-stretch gap-2">
        <div className="flex items-center gap-2">
          <input
            className="h-8 w-28 rounded border bg-transparent px-2"
            type="number"
            min={1}
            max={2000}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(2000, Number(e.target.value) || 1)))}
          />
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <input type="checkbox" onChange={(e) => {
              try {
                if (e.target.checked) {
                  localStorage.setItem('disableCollab', '1');
                } else {
                  localStorage.removeItem('disableCollab');
                }
                location.reload();
              } catch {}
            }} />
            no-collab
          </label>
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <input type="checkbox" onChange={(e) => {
              try {
                if (e.target.checked) {
                  localStorage.setItem('disableSaves', '1');
                } else {
                  localStorage.removeItem('disableSaves');
                }
              } catch {}
            }} />
            no-saves
          </label>
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <input type="checkbox" onChange={(e) => {
              try {
                if (e.target.checked) {
                  localStorage.setItem('simpleMode', '1');
                } else {
                  localStorage.removeItem('simpleMode');
                }
                document.body.classList.toggle('easel-simple', e.target.checked);
              } catch {}
            }} />
            simple
          </label>
        </div>
        <Button size="sm" variant="outline" onClick={() => addGrid(count)}>Add {count}</Button>
        {/* Advanced connect test (hidden by default) */}
        {showAdvanced ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                className="h-8 w-20 rounded border bg-transparent px-2"
                type="number"
                min={50}
                max={2000}
                value={connectChunk}
                onChange={(e) => setConnectChunk(Math.max(50, Math.min(2000, Number(e.target.value) || 50)))}
              />
              <span className="text-[10px] text-muted-foreground">chunk</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => addPairsAndConnect(Math.floor(count / 2), connectChunk)}>Connect pairs</Button>
          </div>
        ) : null}
        <Button size="sm" onClick={generateAllText} disabled={running}>Generate Text</Button>
        <label className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
          <input type="checkbox" onChange={(e) => setShowAdvanced(e.target.checked)} />
          advanced
        </label>
      </div>
    </Panel>
  );
};


