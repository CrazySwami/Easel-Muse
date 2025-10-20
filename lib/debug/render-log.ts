'use client';

import React, { useEffect, useRef } from 'react';

function shallowDiff(prev: Record<string, any>, next: Record<string, any>) {
  const changed: string[] = [];
  const keys = new Set([...Object.keys(prev ?? {}), ...Object.keys(next ?? {})]);
  keys.forEach((k) => {
    if (prev?.[k] !== next?.[k]) changed.push(k);
  });
  return changed;
}

export function useRenderLog(name: string, props: Record<string, any>) {
  const prev = useRef<Record<string, any> | undefined>(undefined);
  const countRef = useRef<number>(0);
  countRef.current += 1;

  if (prev.current) {
    const changed = shallowDiff(prev.current, props);
    // eslint-disable-next-line no-console
    console.info(`[render] ${name} #${countRef.current} changed:`, changed);
  } else {
    // eslint-disable-next-line no-console
    console.info(`[render] ${name} first render`);
  }

  prev.current = props;

  useEffect(() => {
    return () => {
      // eslint-disable-next-line no-console
      console.info(`[render] ${name} unmount (total renders: ${countRef.current})`);
    };
  }, [name]);
}

export function shallowEqual(a: any, b: any) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

export function withRenderLog<T>(Comp: React.ComponentType<T>, name: string) {
  const Wrapped = (props: T) => {
    try {
      useRenderLog(name, props as any);
    } catch {}
    return React.createElement(Comp as any, props as any);
  };
  return React.memo(Wrapped as any, shallowEqual) as any;
}


