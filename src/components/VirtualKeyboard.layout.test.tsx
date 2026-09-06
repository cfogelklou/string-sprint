// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import React from 'react';
import { MIDI_LOWEST, MIDI_C8, NUM_KEYS } from '@/types';
import VirtualKeyboard from './VirtualKeyboard';
import { computeKeyLayout } from '@/model/keyLayout';
import { usePianoStore } from '@/store/pianoStore';

beforeAll(() => {
  // jsdom lacks ResizeObserver (used for key-height measurement)
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

describe('computeKeyLayout', () => {
  it('lays out every key from MIDI_LOWEST to MIDI_C8', () => {
    const { whites, blacks } = computeKeyLayout();
    expect(whites.length + blacks.length).toBe(NUM_KEYS);
    expect(whites[0].midi).toBe(MIDI_LOWEST); // A-1
    expect(blacks[0].midi).toBe(MIDI_LOWEST + 1); // A#-1
    expect(whites[whites.length - 1].midi).toBe(MIDI_C8);
  });

  it('positions the first sub-A0 white key at x=0 and first black key straddling it', () => {
    const { whites, blacks } = computeKeyLayout();
    expect(whites[0].x).toBe(0);
    // One white key (A-1) before A#-1 → x = 1*44 - 14
    expect(blacks[0].x).toBe(30);
  });

  it('positions C#0 (MIDI 13) after the three preceding white keys', () => {
    const { blacks } = computeKeyLayout();
    const cs0 = blacks.find((b) => b.midi === 13)!;
    // Whites before MIDI 13: A-1, B-1, C0 → x = 3*44 - 14
    expect(cs0.x).toBe(3 * 44 - 14);
  });

  it('renders no phantom keys above C8', () => {
    const { whites, blacks } = computeKeyLayout();
    const all = [...whites, ...blacks].map((k) => k.midi);
    expect(Math.max(...all)).toBe(MIDI_C8);
    expect(new Set(all).size).toBe(NUM_KEYS);
  });
});

describe('VirtualKeyboard data-midi (capture-script contract)', () => {
  it('renders a data-midi attribute for every key incl. sub-A0', () => {
    render(<VirtualKeyboard />);
    for (let midi = MIDI_LOWEST; midi <= MIDI_C8; midi++) {
      const el = document.querySelector(`[data-midi="${midi}"]`);
      expect(el, `missing key element for MIDI ${midi}`).not.toBeNull();
    }
    expect(document.querySelectorAll('[data-midi]')).toHaveLength(NUM_KEYS);
    screen.getByText('A-1'); // octave label on the lowest A key
  });

  it('keeps a normal key active after release when Infinite Sustain is enabled', () => {
    act(() => {
      usePianoStore.getState().setInfiniteSustain(true);
    });
    render(<VirtualKeyboard />);

    const key = document.querySelector('[data-midi="69"]')!;
    fireEvent.pointerDown(key, { clientX: 100 });
    fireEvent.pointerUp(key, { clientX: 100 });

    expect(usePianoStore.getState().activeTones.has(69)).toBe(true);
    expect(key.getAttribute('aria-pressed')).toBe('true');
  });

  it('clears active normal note when Infinite Sustain is subsequently disabled', () => {
    act(() => {
      usePianoStore.getState().setInfiniteSustain(true);
    });
    render(<VirtualKeyboard />);

    const key = document.querySelector('[data-midi="69"]')!;
    fireEvent.pointerDown(key, { clientX: 100 });
    fireEvent.pointerUp(key, { clientX: 100 });

    expect(usePianoStore.getState().activeTones.has(69)).toBe(true);
    expect(key.getAttribute('aria-pressed')).toBe('true');

    act(() => {
      usePianoStore.getState().setInfiniteSustain(false);
    });

    expect(usePianoStore.getState().activeTones.has(69)).toBe(false);
    expect(key.getAttribute('aria-pressed')).toBe('false');
  });
});


