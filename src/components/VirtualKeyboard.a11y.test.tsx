// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import React from 'react';
import { MIDI_LOWEST, MIDI_C8 } from '@/types';
import VirtualKeyboard from './VirtualKeyboard';
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
  usePianoStore.getState().selectKey(null);
  usePianoStore.getState().setInfiniteSustain(false);
});

describe('VirtualKeyboard accessibility and keyboard navigation', () => {
  it('implements a roving tabindex where only the active tab stop is 0', () => {
    render(<VirtualKeyboard />);
    const lowestKey = document.querySelector(`[data-midi="${MIDI_LOWEST}"]`)!;
    const c4Key = document.querySelector('[data-midi="60"]')!;

    // Initially with selectedKeyId = null, MIDI_LOWEST is the active tab stop
    expect(lowestKey.getAttribute('tabindex')).toBe('0');
    expect(c4Key.getAttribute('tabindex')).toBe('-1');

    // Selecting C4 moves the roving tab stop to C4
    act(() => {
      usePianoStore.getState().selectKey(60);
    });
    expect(lowestKey.getAttribute('tabindex')).toBe('-1');
    expect(c4Key.getAttribute('tabindex')).toBe('0');
  });

  it('navigates keys with ArrowLeft, ArrowRight, Home, and End', () => {
    render(<VirtualKeyboard />);
    const c4Key = document.querySelector('[data-midi="60"]')!;
    act(() => {
      usePianoStore.getState().selectKey(60);
    });

    // ArrowRight moves to C#4 (61)
    fireEvent.keyDown(c4Key, { key: 'ArrowRight' });
    expect(usePianoStore.getState().selectedKeyId).toBe(61);

    const cs4Key = document.querySelector('[data-midi="61"]')!;
    // ArrowLeft moves to C4 (60)
    fireEvent.keyDown(cs4Key, { key: 'ArrowLeft' });
    expect(usePianoStore.getState().selectedKeyId).toBe(60);

    // End moves to MIDI_C8
    fireEvent.keyDown(c4Key, { key: 'End' });
    expect(usePianoStore.getState().selectedKeyId).toBe(MIDI_C8);

    const c8Key = document.querySelector(`[data-midi="${MIDI_C8}"]`)!;
    // Home moves to MIDI_LOWEST
    fireEvent.keyDown(c8Key, { key: 'Home' });
    expect(usePianoStore.getState().selectedKeyId).toBe(MIDI_LOWEST);
  });

  it('activates and releases note with Enter and Space keys', () => {
    render(<VirtualKeyboard />);
    const a4Key = screen.getByRole('button', { name: 'Play A4' });

    // Enter plays note and marks key pressed
    fireEvent.keyDown(a4Key, { key: 'Enter' });
    expect(usePianoStore.getState().activeTones.has(69)).toBe(true);
    expect(usePianoStore.getState().selectedKeyId).toBe(69);

    fireEvent.keyUp(a4Key, { key: 'Enter' });
    expect(usePianoStore.getState().activeTones.has(69)).toBe(false);

    // Space plays note
    fireEvent.keyDown(a4Key, { key: ' ' });
    expect(usePianoStore.getState().activeTones.has(69)).toBe(true);

    fireEvent.keyUp(a4Key, { key: ' ' });
    expect(usePianoStore.getState().activeTones.has(69)).toBe(false);
  });

  it('exposes accessible names and aria-pressed states', () => {
    render(<VirtualKeyboard />);
    const a4Key = screen.getByRole('button', { name: 'Play A4' });
    expect(a4Key.getAttribute('aria-pressed')).toBe('false');

    fireEvent.pointerDown(a4Key);
    expect(a4Key.getAttribute('aria-pressed')).toBe('true');

    fireEvent.pointerUp(a4Key);
    expect(a4Key.getAttribute('aria-pressed')).toBe('false');
  });
});
