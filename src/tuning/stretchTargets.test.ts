import { describe, it, expect } from 'vitest';
import { computeTargets, computeResults } from '@/tuning/stretchTargets';
import { MIDI_A0, NUM_KEYS } from '@/types';
import { PIANO_B_PROFILES } from '@/bCoefficients/profiles';

describe('computeTargets', () => {
  const uprightB = PIANO_B_PROFILES.upright;

  it('equal strategy returns all zeros', () => {
    const targets = computeTargets({ kind: 'equal' }, uprightB);
    expect(targets).toHaveLength(NUM_KEYS);
    expect(targets.every((t) => t === 0)).toBe(true);
  });

  it('railsback strategy returns 88 values with correct shape', () => {
    const targets = computeTargets({ kind: 'railsback' }, uprightB);
    expect(targets).toHaveLength(NUM_KEYS);
    // Bass should be flat (negative)
    expect(targets[0]).toBeLessThan(0);
    // Treble should be sharp (positive)
    expect(targets[NUM_KEYS - 1]).toBeGreaterThan(0);
    // Crossing point near middle should be close to 0
    const midIdx = 44; // roughly C4
    expect(Math.abs(targets[midIdx])).toBeLessThan(1);
  });

  it('partial_align strategy returns 88 values', () => {
    const targets = computeTargets({ kind: 'partial_align', partial: 2 }, uprightB);
    expect(targets).toHaveLength(NUM_KEYS);
    // Higher notes with more inharmonicity need more stretch
    // Last note (C8) falls back to 0 (no note an octave above)
    // Second-to-last should also be near 0 or the fallback
  });

  it('partial_align with partial=2 produces non-zero offsets for mid-range', () => {
    const targets = computeTargets({ kind: 'partial_align', partial: 2 }, uprightB);
    // A4 (index 48) should have a measurable stretch
    const a4Idx = 69 - MIDI_A0; // MIDI 69 = A4
    expect(Math.abs(targets[a4Idx])).toBeGreaterThan(0);
  });

  it('partial_align higher partials produce larger stretches', () => {
    const targets2 = computeTargets({ kind: 'partial_align', partial: 2 }, uprightB);
    const targets4 = computeTargets({ kind: 'partial_align', partial: 4 }, uprightB);
    const midIdx = 48;
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
    stretchTargets[69 - MIDI_A0] = 5.0; // target is +5 cents for A4
    const commits = new Map<number, number>();
    commits.set(69, 5.5); // user tuned to +5.5, error = 0.5
    const results = computeResults(commits, stretchTargets);
    expect(results.notes[0].error).toBeCloseTo(0.5, 5);
    expect(results.notes[0].targetCents).toBe(5.0);
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
