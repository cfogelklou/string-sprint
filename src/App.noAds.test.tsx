// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import App from './App';
import { usePianoStore } from '@/store/pianoStore';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  usePianoStore.getState().stopAll();
  usePianoStore.getState().setInfiniteSustain(false);
});

describe('App advertising verification (REQ-UI-007, SCN-UI-004)', () => {
  it('renders application without any advertisement element, ins tag, or adsbygoogle presence', () => {
    // Ensure clean window state
    delete (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle;

    const { container } = render(<App />);

    // Check DOM for ad-related elements or classes
    const adsByGoogle = container.querySelectorAll('.adsbygoogle');
    expect(adsByGoogle).toHaveLength(0);

    const insTags = container.querySelectorAll('ins');
    expect(insTags).toHaveLength(0);

    const adLabels = container.querySelectorAll('[aria-label="Advertisement"]');
    expect(adLabels).toHaveLength(0);

    // Verify window.adsbygoogle was not initialized or pushed to by App render
    const win = window as unknown as { adsbygoogle?: unknown[] };
    expect(win.adsbygoogle).toBeUndefined();
  });
});
