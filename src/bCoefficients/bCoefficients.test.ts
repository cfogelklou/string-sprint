import { describe, it, expect } from 'vitest';
import { PIANO_PROFILE_NAMES, MIDI_A0, NUM_KEYS, PianoProfileName } from '@/types';
import { PIANO_B_PROFILES, PROFILE_LABELS, getBForNote } from './profiles';
import { DEFAULT_RIGAUD_PARAMS, rigaudB, generateProfile } from './rigaud';

const PROFILE_NAMES = Object.values(PIANO_PROFILE_NAMES) as PianoProfileName[];

describe('PIANO_B_PROFILES', () => {
  it('has all 6 profiles', () => {
    expect(PROFILE_NAMES).toHaveLength(6);
    for (const name of PROFILE_NAMES) {
      expect(PIANO_B_PROFILES[name]).toBeDefined();
    }
  });

  it('each profile has exactly 88 values', () => {
    for (const name of PROFILE_NAMES) {
      expect(PIANO_B_PROFILES[name]).toHaveLength(NUM_KEYS);
    }
  });

  it('all B values are positive numbers', () => {
    for (const name of PROFILE_NAMES) {
      for (const b of PIANO_B_PROFILES[name]) {
        expect(b).toBeGreaterThan(0);
        expect(Number.isFinite(b)).toBe(true);
      }
    }
  });

  it('exhibits U-shape: bass and treble higher than midrange', () => {
    for (const name of PROFILE_NAMES) {
      const values = PIANO_B_PROFILES[name];
      const first = values[0];
      const last = values[values.length - 1];
      // Find minimum in the middle region (indices 30-50)
      const midSlice = values.slice(30, 51);
      const midMin = Math.min(...midSlice);
      expect(first).toBeGreaterThan(midMin);
      expect(last).toBeGreaterThan(midMin);
    }
  });

  it('smaller pianos have higher treble B values', () => {
    const lastIdx = NUM_KEYS - 1;
    const concertTreble = PIANO_B_PROFILES[PIANO_PROFILE_NAMES.CONCERT_GRAND][lastIdx];
    const studioTreble = PIANO_B_PROFILES[PIANO_PROFILE_NAMES.STUDIO_GRAND][lastIdx];
    const babyTreble = PIANO_B_PROFILES[PIANO_PROFILE_NAMES.BABY_GRAND][lastIdx];
    const uprightTreble = PIANO_B_PROFILES[PIANO_PROFILE_NAMES.UPRIGHT][lastIdx];
    const consoleTreble = PIANO_B_PROFILES[PIANO_PROFILE_NAMES.CONSOLE][lastIdx];
    const spinetTreble = PIANO_B_PROFILES[PIANO_PROFILE_NAMES.SPINET][lastIdx];

    expect(concertTreble).toBeLessThan(studioTreble);
    expect(studioTreble).toBeLessThan(babyTreble);
    expect(babyTreble).toBeLessThan(uprightTreble);
    expect(uprightTreble).toBeLessThan(consoleTreble);
    expect(consoleTreble).toBeLessThan(spinetTreble);
  });
});

describe('PROFILE_LABELS', () => {
  it('has a label for every profile', () => {
    for (const name of PROFILE_NAMES) {
      expect(PROFILE_LABELS[name]).toBeDefined();
      expect(typeof PROFILE_LABELS[name]).toBe('string');
      expect(PROFILE_LABELS[name].length).toBeGreaterThan(0);
    }
  });
});

describe('getBForNote', () => {
  it('returns correct value matching array index', () => {
    for (const name of PROFILE_NAMES) {
      const values = PIANO_B_PROFILES[name];
      for (let i = 0; i < NUM_KEYS; i++) {
        const midiNote = MIDI_A0 + i;
        expect(getBForNote(name, midiNote)).toBeCloseTo(values[i], 10);
      }
    }
  });

  it('throws for MIDI note below range', () => {
    expect(() => getBForNote(PIANO_PROFILE_NAMES.CONCERT_GRAND, MIDI_A0 - 1)).toThrow(RangeError);
  });

  it('throws for MIDI note above range', () => {
    expect(() => getBForNote(PIANO_PROFILE_NAMES.CONCERT_GRAND, MIDI_A0 + NUM_KEYS)).toThrow(RangeError);
  });
});

describe('Rigaud parametric model', () => {
  it('rigaudB returns positive values across the keyboard', () => {
    const params = DEFAULT_RIGAUD_PARAMS[PIANO_PROFILE_NAMES.CONCERT_GRAND];
    for (let midi = MIDI_A0; midi < MIDI_A0 + NUM_KEYS; midi++) {
      const b = rigaudB(midi, params);
      expect(b).toBeGreaterThan(0);
      expect(Number.isFinite(b)).toBe(true);
    }
  });

  it('generateProfile returns array of length 88', () => {
    for (const name of PROFILE_NAMES) {
      const params = DEFAULT_RIGAUD_PARAMS[name];
      const profile = generateProfile(params);
      expect(profile).toHaveLength(NUM_KEYS);
    }
  });

  it('generates values matching tabulated profiles within ±10% tolerance', () => {
    const tolerance = 0.10;
    for (const name of PROFILE_NAMES) {
      const params = DEFAULT_RIGAUD_PARAMS[name];
      const generated = generateProfile(params);
      const tabulated = PIANO_B_PROFILES[name];

      for (let i = 0; i < NUM_KEYS; i++) {
        const relError = Math.abs(generated[i] - tabulated[i]) / tabulated[i];
        expect(relError).toBeLessThanOrEqual(tolerance);
      }
    }
  });
});
