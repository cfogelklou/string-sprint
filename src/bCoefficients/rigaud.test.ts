import { describe, it, expect } from 'vitest';
import { MIDI_A0, MIDI_C8, MIDI_LOWEST, NUM_KEYS, PIANO_PROFILE_NAMES } from '@/types';
import { generateProfile, rigaudB, DEFAULT_RIGAUD_PARAMS } from './rigaud';

describe('generateProfile', () => {
  const params = DEFAULT_RIGAUD_PARAMS[PIANO_PROFILE_NAMES.UPRIGHT];

  it('returns NUM_KEYS values', () => {
    expect(generateProfile(params)).toHaveLength(NUM_KEYS);
  });

  it('plateaus below A0: indices 0..11 equal the A0 value at index 12', () => {
    const profile = generateProfile(params);
    const a0 = rigaudB(MIDI_A0, params);
    expect(profile[12]).toBeCloseTo(a0, 15);
    for (let i = 0; i < MIDI_A0 - MIDI_LOWEST; i++) {
      expect(profile[i]).toBeCloseTo(a0, 15);
    }
  });

  it('generates the theoretical model only for real keys A0..C8', () => {
    // Never extend Rigaud below A0 (CLAUDE.md B-coefficient rule) —
    // sub-A0 must be the plateau above, and the model values start at index 12.
    const profile = generateProfile(params);
    for (let i = 12; i < NUM_KEYS; i++) {
      expect(profile[i]).toBeCloseTo(rigaudB(MIDI_LOWEST + i, params), 15);
    }
    expect(profile[NUM_KEYS - 1]).toBeCloseTo(rigaudB(MIDI_C8, params), 15);
  });
});
