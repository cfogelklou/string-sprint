import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

describe('Responsive and motion CSS rules (REQ-UI-004, REQ-UI-005, SCN-UI-003)', () => {
  const cssPath = path.resolve(process.cwd(), 'src/index.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  it('contains max-width 360px breakpoint for wrapping controls and bassline buttons', () => {
    expect(css).toContain('@media (max-width: 360px)');
    expect(css).toContain('.controls-bar-title');
    expect(css).toContain('.bassline-controls');
  });

  it('contains max-height 520px breakpoint for short viewports ensuring reachability without clipping', () => {
    expect(css).toContain('@media (max-height: 520px)');
    expect(css).toContain('overflow-y: auto');
  });

  it('contains prefers-reduced-motion media query providing static non-animated target state', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('.piano-key-target');
    expect(css).toContain('animation: none !important');
    expect(css).toContain('box-shadow: inset 0 0 0 3px #ff6600');
  });

  it('provides visible scrollbar styles for keyboard scrolling area', () => {
    expect(css).toContain('.keyboard-area,');
    expect(css).toContain('.keyboard-scroll');
    expect(css).toContain('scrollbar-width: thin');
    expect(css).toContain('::-webkit-scrollbar');
  });

  it('provides visible focus ring on interactive elements', () => {
    expect(css).toContain(':focus-visible');
    expect(css).toContain('--focus-ring');
  });
});
