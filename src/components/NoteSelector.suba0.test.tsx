import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { MIDI_LOWEST } from '@/types';
import { usePianoStore } from '@/store/pianoStore';
import NoteSelector from './NoteSelector';

describe('NoteSelector sub-A0 selection and pitch display', () => {
  it('shows the A-1 note name and frequency for MIDI 9', () => {
    usePianoStore.getState().setCentsOffset(MIDI_LOWEST, 0);
    usePianoStore.getState().selectKey(MIDI_LOWEST);
    render(<NoteSelector />);
    expect(usePianoStore.getState().selectedKeyId).toBe(MIDI_LOWEST);
    // 13.75 Hz fundamental, displayed with 2 decimals
    expect(document.body.textContent).toContain('A-1');
    expect(document.body.textContent).toContain('13.75 Hz');
  });

  it('updates displayed frequency to include cents offset', () => {
    // A4 (MIDI 69) with +100 cents (1 semitone sharp => A#4 / 466.16 Hz)
    usePianoStore.getState().selectKey(69);
    act(() => {
      usePianoStore.getState().setCentsOffset(69, 100);
    });
    const { rerender } = render(<NoteSelector />);
    expect(document.body.textContent).toContain('466.16 Hz');

    // With -100 cents (1 semitone flat => G#4 / 415.30 Hz)
    act(() => {
      usePianoStore.getState().setCentsOffset(69, -100);
    });
    rerender(<NoteSelector />);
    expect(document.body.textContent).toContain('415.30 Hz');
  });
});
