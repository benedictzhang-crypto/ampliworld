'use client';

import { Component, Suspense, type ReactNode } from 'react';

/** One delayed or failed asset must not remove already-loaded neighbours. */
class AssetErrorBoundary extends Component<
  { name: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) {
    console.error(`World asset failed: ${this.props.name}`, error);
  }
  render() { return this.state.failed ? null : this.props.children; }
}

export function AssetIsland({ name, children }: { name: string; children: ReactNode }) {
  return <AssetErrorBoundary name={name}>
    <Suspense fallback={null}>{children}</Suspense>
  </AssetErrorBoundary>;
}
