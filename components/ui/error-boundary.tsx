'use client';

import type { ReactNode } from 'react';
import { Component } from 'react';

type Props = {
  fallback: ReactNode;
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch() {
    // no-op; we only swap to fallback
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}


