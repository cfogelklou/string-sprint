// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MIDI_LOWEST, MIDI_C8 } from '@/types';
import KeyboardMinimap from './KeyboardMinimap';
import { usePianoStore } from '@/store/pianoStore';

beforeEach(() => {
  if (typeof window.PointerEvent === 'undefined') {
    window.PointerEvent = window.MouseEvent as unknown as typeof PointerEvent;
  }
  usePianoStore.getState().stopAll();
  usePianoStore.getState().selectKey(60);
});

describe('KeyboardMinimap accessibility and interaction', () => {
  it('renders with slider role and accurate aria attributes', () => {
    const onJumpToNote = vi.fn();
    render(<KeyboardMinimap onJumpToNote={onJumpToNote} />);

    const slider = screen.getByRole('slider', { name: 'Selected piano key' });
    expect(slider).toBeInTheDocument();
    expect(slider.getAttribute('aria-valuemin')).toBe(String(MIDI_LOWEST));
    expect(slider.getAttribute('aria-valuemax')).toBe(String(MIDI_C8));
    expect(slider.getAttribute('aria-valuenow')).toBe('60');
    expect(slider.getAttribute('aria-valuetext')).toBe('C4');
  });

  it('updates selection on pointer down based on bounding box ratio', () => {
    const onJumpToNote = vi.fn();
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 320,
      height: 10,
      right: 320,
      bottom: 10,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect);

    render(<KeyboardMinimap onJumpToNote={onJumpToNote} />);
    const slider = screen.getByRole('slider');

    // Click at 50% width
    fireEvent.pointerDown(slider, { clientX: 160 });
    expect(onJumpToNote).toHaveBeenCalled();
    const calledMidi = onJumpToNote.mock.calls[0][0];
    expect(calledMidi).toBeGreaterThanOrEqual(MIDI_LOWEST);
    expect(calledMidi).toBeLessThanOrEqual(MIDI_C8);
    spy.mockRestore();
  });

  it('handles keyboard navigation with Arrow, Home, and End keys', () => {
    const onJumpToNote = vi.fn();
    render(<KeyboardMinimap onJumpToNote={onJumpToNote} />);

    const slider = screen.getByRole('slider');

    // ArrowRight / ArrowUp increments note
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onJumpToNote).toHaveBeenLastCalledWith(61);

    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(onJumpToNote).toHaveBeenLastCalledWith(61);

    // ArrowLeft / ArrowDown decrements note
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onJumpToNote).toHaveBeenLastCalledWith(59);

    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(onJumpToNote).toHaveBeenLastCalledWith(59);

    // Home jumps to MIDI_LOWEST
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onJumpToNote).toHaveBeenLastCalledWith(MIDI_LOWEST);

    // End jumps to MIDI_C8
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onJumpToNote).toHaveBeenLastCalledWith(MIDI_C8);
  });
});
