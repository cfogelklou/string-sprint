import { describe, it, expect } from 'vitest';
import {
  midiToFreq,
  midiToNoteName,
  isBlackKey,
  generate88Keys,
  freqToMidi,
  freqToCents,
  NOTE_NAMES,
} from './pianoNotes';
import { MIDI_A0, MIDI_C8, NUM_KEYS, DEFAULT_A4 } from '@/types';

describe('midiToFreq', () => {
  it('returns 440 Hz for MIDI 69 (A4) with default tuning', () => {
    expect(midiToFreq(69)).toBe(DEFAULT_A4);
  });

  it('returns ~27.5 Hz for MIDI 21 (A0)', () => {
    expect(midiToFreq(MIDI_A0)).toBeCloseTo(27.5, 1);
  });

  it('returns ~4186 Hz for MIDI 108 (C8)', () => {
    expect(midiToFreq(MIDI_C8)).toBeCloseTo(4186, 0);
  });

  it('respects custom A4 tuning', () => {
    expect(midiToFreq(69, 442)).toBe(442);
  });
});

describe('midiToNoteName', () => {
  it('names MIDI 21 as A0', () => {
    expect(midiToNoteName(MIDI_A0)).toBe('A0');
  });

  it('names MIDI 69 as A4', () => {
    expect(midiToNoteName(69)).toBe('A4');
  });

  it('names MIDI 108 as C8', () => {
    expect(midiToNoteName(MIDI_C8)).toBe('C8');
  });

  it('names MIDI 60 as C4 (middle C)', () => {
    expect(midiToNoteName(60)).toBe('C4');
  });
});

describe('isBlackKey', () => {
  it('A0 (MIDI 21) is not a black key', () => {
    expect(isBlackKey(MIDI_A0)).toBe(false);
  });

  it('A#0 (MIDI 22) is a black key', () => {
    expect(isBlackKey(22)).toBe(true);
  });

  it('C#1 (MIDI 25) is a black key', () => {
    expect(isBlackKey(25)).toBe(true);
  });

  it('C4 (MIDI 60) is not a black key', () => {
    expect(isBlackKey(60)).toBe(false);
  });

  it('C#4 (MIDI 61) is a black key', () => {
    expect(isBlackKey(61)).toBe(true);
  });
});

describe('generate88Keys', () => {
  const flatProfile = new Array(NUM_KEYS).fill(0.0001);
  const keys = generate88Keys(flatProfile);

  it('returns exactly 88 keys', () => {
    expect(keys).toHaveLength(NUM_KEYS);
  });

  it('starts at MIDI 21 (A0)', () => {
    expect(keys[0].midiNote).toBe(MIDI_A0);
    expect(keys[0].name).toBe('A0');
    expect(keys[0].isBlack).toBe(false);
  });

  it('ends at MIDI 108 (C8)', () => {
    const last = keys[keys.length - 1];
    expect(last.midiNote).toBe(MIDI_C8);
    expect(last.name).toBe('C8');
  });

  it('has monotonically increasing MIDI notes', () => {
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i].midiNote).toBe(keys[i - 1].midiNote + 1);
    }
  });

  it('assigns B values from the profile', () => {
    expect(keys[0].B).toBe(0.0001);
    expect(keys[87].B).toBe(0.0001);
  });

  it('initializes centsOffset to 0', () => {
    for (const key of keys) {
      expect(key.centsOffset).toBe(0);
    }
  });

  it('computes fundamentalFreq correctly for first key', () => {
    expect(keys[0].fundamentalFreq).toBeCloseTo(midiToFreq(MIDI_A0), 10);
  });
});

describe('freqToMidi', () => {
  it('returns 69 for 440 Hz', () => {
    expect(freqToMidi(DEFAULT_A4)).toBe(69);
  });

  it('round-trips with midiToFreq for all 88 keys', () => {
    for (let midi = MIDI_A0; midi <= MIDI_C8; midi++) {
      expect(freqToMidi(midiToFreq(midi))).toBe(midi);
    }
  });

  it('respects custom A4 tuning', () => {
    expect(freqToMidi(442, 442)).toBe(69);
  });
});

describe('freqToCents', () => {
  it('returns 0 for identical frequencies', () => {
    expect(freqToCents(440, 440)).toBeCloseTo(0, 10);
  });

  it('returns ~1200 for an octave up', () => {
    expect(freqToCents(880, 440)).toBeCloseTo(1200, 6);
  });

  it('returns ~-1200 for an octave down', () => {
    expect(freqToCents(220, 440)).toBeCloseTo(-1200, 6);
  });
});

describe('NOTE_NAMES', () => {
  it('has 12 entries', () => {
    expect(NOTE_NAMES).toHaveLength(12);
  });

  it('starts with C and ends with B', () => {
    expect(NOTE_NAMES[0]).toBe('C');
    expect(NOTE_NAMES[11]).toBe('B');
  });
});
