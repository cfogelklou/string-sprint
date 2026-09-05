// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { MIDI_LOWEST } from '@/types';
import { usePianoStore } from '@/store/pianoStore';
import NoteSelector from './NoteSelector';

describe('NoteSelector sub-A0 selection', () => {
  it('shows the A-1 note name and frequency for MIDI 9', () => {
    usePianoStore.getState().selectKey(MIDI_LOWEST);
    render(<NoteSelector />);
    expect(usePianoStore.getState().selectedKeyId).toBe(MIDI_LOWEST);
    // 13.75 Hz fundamental, displayed with 2 decimals
    expect(document.body.textContent).toContain('A-1');
    expect(document.body.textContent).toContain('13.75');
  });
});
