import { describe, it, expect } from 'vitest';
import { PIANO_PROFILE_NAMES, MIDI_A0, MIDI_LOWEST, NUM_KEYS, PianoProfileName } from '@/types';
import { PIANO_B_PROFILES, PROFILE_LABELS, getBForNote } from './profiles';

const PROFILE_NAMES = Object.values(PIANO_PROFILE_NAMES) as PianoProfileName[];

/** Number of sub-A0 keys prepended as a plateau (MIDI 9..20). */
const PLATEAU_LEN = MIDI_A0 - MIDI_LOWEST;

/** Profiles with physical (non-zero) B coefficients. IDEAL and OTHER are excluded: both use all-zero B values (OTHER = Digital/Synth has no physical string inharmonicity). */
const PHYSICAL_PROFILES = PROFILE_NAMES.filter(
  (n) => n !== PIANO_PROFILE_NAMES.IDEAL && n !== PIANO_PROFILE_NAMES.OTHER,
);

describe('PIANO_B_PROFILES', () => {
  it('has all 8 profiles', () => {
    expect(PROFILE_NAMES).toHaveLength(8);
    for (const name of PROFILE_NAMES) {
      expect(PIANO_B_PROFILES[name]).toBeDefined();
    }
  });

  it('each profile has exactly NUM_KEYS values', () => {
    for (const name of PROFILE_NAMES) {
      expect(PIANO_B_PROFILES[name]).toHaveLength(NUM_KEYS);
    }
  });

  it('preserves the former 88 values and plateaus below A0 (physical profiles)', () => {
    // Spot-pinned original values: A0 at index 12 and C8 at index 99 must be
    // byte-for-byte the pre-extension literals — catches any off-by-one prepend
    // that shifts or replaces real piano data.
    const pins: Partial<Record<PianoProfileName, [number, number]>> = {
      [PIANO_PROFILE_NAMES.CONCERT_GRAND]: [0.0001643, 0.0027452],
      [PIANO_PROFILE_NAMES.STUDIO_GRAND]: [0.0003285, 0.0044491],
      [PIANO_PROFILE_NAMES.BABY_GRAND]: [0.0004467, 0.0049476],
      [PIANO_PROFILE_NAMES.UPRIGHT]: [0.0005432, 0.0213774],
      [PIANO_PROFILE_NAMES.CONSOLE]: [0.0006387, 0.0447209],
      [PIANO_PROFILE_NAMES.SPINET]: [0.0009846, 0.105365],
    };
    for (const name of PHYSICAL_PROFILES) {
      const values = PIANO_B_PROFILES[name];
      // Sub-A0 plateau: indices 0..11 all equal the A0 value at index 12
      expect(values.slice(0, PLATEAU_LEN)).toEqual(new Array(PLATEAU_LEN).fill(values[PLATEAU_LEN]));
      // A0 slot keeps the original first value
      expect(values[PLATEAU_LEN]).toBe(pins[name]![0]);
      // C8 keeps the original last value at the new last index
      expect(values[NUM_KEYS - 1]).toBe(pins[name]![1]);
    }
  });

  it('all B values are positive numbers (physical profiles only)', () => {
    for (const name of PHYSICAL_PROFILES) {
      for (const b of PIANO_B_PROFILES[name]) {
        expect(b).toBeGreaterThan(0);
        expect(Number.isFinite(b)).toBe(true);
      }
    }
  });

  it('IDEAL profile has all-zero B values', () => {
    const ideal = PIANO_B_PROFILES[PIANO_PROFILE_NAMES.IDEAL];
    expect(ideal).toHaveLength(NUM_KEYS);
    for (const b of ideal) {
      expect(b).toBe(0);
    }
  });

  it('exhibits U-shape: bass and treble higher than midrange (physical profiles only)', () => {
    for (const name of PHYSICAL_PROFILES) {
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
        const midiNote = MIDI_LOWEST + i;
        expect(getBForNote(name, midiNote)).toBeCloseTo(values[i], 10);
      }
    }
  });

  it('accepts sub-A0 notes down to MIDI_LOWEST', () => {
    expect(() => getBForNote(PIANO_PROFILE_NAMES.UPRIGHT, MIDI_LOWEST)).not.toThrow();
    // Plateau: A-1 returns the profile's A0 slot value
    expect(getBForNote(PIANO_PROFILE_NAMES.UPRIGHT, MIDI_LOWEST))
      .toBe(PIANO_B_PROFILES[PIANO_PROFILE_NAMES.UPRIGHT][PLATEAU_LEN]);
  });

  it('throws for MIDI note below range', () => {
    expect(() => getBForNote(PIANO_PROFILE_NAMES.CONCERT_GRAND, MIDI_LOWEST - 1)).toThrow(RangeError);
  });

  it('throws for MIDI note above range', () => {
    expect(() => getBForNote(PIANO_PROFILE_NAMES.CONCERT_GRAND, MIDI_LOWEST + NUM_KEYS)).toThrow(RangeError);
  });
});
