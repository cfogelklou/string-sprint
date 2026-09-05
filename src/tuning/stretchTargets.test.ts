import { describe, it, expect } from 'vitest';
import { computeTargets, computeResults } from '@/tuning/stretchTargets';
import { MIDI_LOWEST, NUM_KEYS } from '@/types';
import { PIANO_B_PROFILES } from '@/bCoefficients/profiles';

describe('computeTargets', () => {
  const uprightB = PIANO_B_PROFILES.upright;

  it('equal strategy returns all zeros', () => {
    const targets = computeTargets({ kind: 'equal' }, uprightB);
    expect(targets).toHaveLength(NUM_KEYS);
    expect(targets.every((t) => t === 0)).toBe(true);
  });

  it('railsback strategy returns NUM_KEYS values with correct shape', () => {
    const targets = computeTargets({ kind: 'railsback' }, uprightB);
    expect(targets).toHaveLength(NUM_KEYS);
    // Bass should be flat (negative)
    expect(targets[0]).toBeLessThan(0);
    // Treble should be sharp (positive)
    expect(targets[NUM_KEYS - 1]).toBeGreaterThan(0);
    // Crossing point near the temperament region should be close to 0
    const midIdx = 65 - MIDI_LOWEST; // roughly F4
    expect(Math.abs(targets[midIdx])).toBeLessThan(1);
  });

  it('railsback plateaus below A0 and preserves the published curve above', () => {
    const targets = computeTargets({ kind: 'railsback' }, uprightB);
    // Sub-A0 plateau holds the A0 deviation value (no invented data)
    expect(targets.slice(0, 13)).toEqual(new Array(13).fill(-30.0));
    // A0 seam keeps the published A0 deviation at index 12
    expect(targets[12]).toBe(-30.0);
    // C8 keeps the published treble endpoint at the new last index
    expect(targets[NUM_KEYS - 1]).toBe(13.5);
  });

  it('partial_align strategy returns NUM_KEYS values', () => {
    const targets = computeTargets({ kind: 'partial_align', partial: 2 }, uprightB);
    expect(targets).toHaveLength(NUM_KEYS);
    // Higher notes with more inharmonicity need more stretch
    // Last note (C8) falls back to 0 (no note an octave above)
    // Second-to-last should also be near 0 or the fallback
  });

  it('partial_align computes real targets for sub-A0 notes', () => {
    const targets = computeTargets({ kind: 'partial_align', partial: 2 }, uprightB);
    // A-1 (MIDI 9) has an octave above (A0) — must get a real computed target,
    // not a fallback or a mis-indexed value
    const idx = 9 - MIDI_LOWEST;
    expect(idx).toBe(0);
    expect(Number.isFinite(targets[idx])).toBe(true);
    // Plateau B (A0 value) is non-zero → partial freq differs from ET octave
    expect(Math.abs(targets[idx])).toBeGreaterThan(0);
  });

  it('partial_align with partial=2 produces non-zero offsets for mid-range', () => {
    const targets = computeTargets({ kind: 'partial_align', partial: 2 }, uprightB);
    // A4 should have a measurable stretch
    const a4Idx = 69 - MIDI_LOWEST; // MIDI 69 = A4
    expect(Math.abs(targets[a4Idx])).toBeGreaterThan(0);
  });

  it('partial_align higher partials produce larger stretches', () => {
    const targets2 = computeTargets({ kind: 'partial_align', partial: 2 }, uprightB);
    const targets4 = computeTargets({ kind: 'partial_align', partial: 4 }, uprightB);
    const midIdx = 69 - MIDI_LOWEST; // A4
    // Higher partials are sharper (due to inharmonicity), so need more compensation
    expect(Math.abs(targets4[midIdx])).toBeGreaterThan(Math.abs(targets2[midIdx]));
  });
});

describe('computeResults', () => {
  const targets = new Array(NUM_KEYS).fill(0);

  it('returns empty results for no commits', () => {
    const results = computeResults(new Map(), targets);
    expect(results.notes).toHaveLength(0);
    expect(results.meanAbsoluteError).toBe(0);
    expect(results.grade).toBe('A+');
  });

  it('computes correct mean absolute error', () => {
    const commits = new Map<number, number>();
    commits.set(69, 1.0); // A4, 1 cent off
    commits.set(60, -2.0); // C4, -2 cents off
    const results = computeResults(commits, targets);
    expect(results.meanAbsoluteError).toBeCloseTo(1.5, 5);
    expect(results.notes).toHaveLength(2);
  });

  it('assigns correct grade', () => {
    const commits = new Map<number, number>();
    commits.set(69, 0.1);
    const results = computeResults(commits, targets);
    expect(results.meanAbsoluteError).toBeCloseTo(0.1, 5);
    expect(results.grade).toBe('A+');
  });

  it('counts notes within thresholds', () => {
    const commits = new Map<number, number>();
    commits.set(69, 0.3); // within 0.5
    commits.set(60, 0.8); // within 1.0 but not 0.5
    commits.set(50, 1.5); // within 2.0 but not 1.0
    commits.set(40, 3.0); // not within 2.0
    const results = computeResults(commits, targets);
    expect(results.withinHalfCent).toBe(1);
    expect(results.withinOneCent).toBe(2);
    expect(results.withinTwoCents).toBe(3);
  });

  it('scores against non-zero targets correctly', () => {
    const stretchTargets = new Array(NUM_KEYS).fill(0);
    stretchTargets[69 - MIDI_LOWEST] = 5.0; // target is +5 cents for A4
    const commits = new Map<number, number>();
    commits.set(69, 5.5); // user tuned to +5.5, error = 0.5
    const results = computeResults(commits, stretchTargets);
    expect(results.notes[0].error).toBeCloseTo(0.5, 5);
    expect(results.notes[0].targetCents).toBe(5.0);
  });

  it('scores sub-A0 commits (MIDI 9) against the correct target slot', () => {
    const stretchTargets = new Array(NUM_KEYS).fill(0);
    stretchTargets[9 - MIDI_LOWEST] = -30.0;
    const commits = new Map<number, number>();
    commits.set(9, -29.0);
    const results = computeResults(commits, stretchTargets);
    expect(results.notes).toHaveLength(1);
    expect(results.notes[0].targetCents).toBe(-30.0);
    expect(results.notes[0].error).toBeCloseTo(1.0, 5);
  });

  it('sorts results by MIDI note', () => {
    const commits = new Map<number, number>();
    commits.set(69, 1.0);
    commits.set(40, 2.0);
    commits.set(60, 0.5);
    const results = computeResults(commits, targets);
    expect(results.notes[0].midiNote).toBe(40);
    expect(results.notes[1].midiNote).toBe(60);
    expect(results.notes[2].midiNote).toBe(69);
  });
});
