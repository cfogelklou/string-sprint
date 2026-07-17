import { describe, it, expect } from 'vitest';
import {
  calculateRailsbackOffset,
  gradeSampleMeasurements,
} from './ptaCalculations';
import { NUM_KEYS, PIANO_PROFILE_NAMES } from '@/types';
import { PIANO_B_PROFILES } from '@/bCoefficients/profiles';

// ---------------------------------------------------------------------------
// calculateRailsbackOffset
// ---------------------------------------------------------------------------

describe('calculateRailsbackOffset', () => {
  it('returns 88 values', () => {
    const bValues = new Array(NUM_KEYS).fill(0.001);
    const result = calculateRailsbackOffset(bValues, '4:2');
    expect(result).toHaveLength(88);
  });

  it('A4 has zero offset', () => {
    const bValues = new Array(NUM_KEYS).fill(0.001);
    const result = calculateRailsbackOffset(bValues, '4:2');
    expect(result[48]).toBe(0); // A4 at index 48
  });

  it('bass is flat (negative cents) and treble is sharp (positive cents)', () => {
    const profile = PIANO_B_PROFILES[PIANO_PROFILE_NAMES.CONCERT_GRAND];
    const result = calculateRailsbackOffset(profile, '4:2');

    expect(result[0]).toBeLessThan(0);  // A0
    expect(result[10]).toBeLessThan(0); // Around E1
    expect(result[80]).toBeGreaterThan(0); // Around A7
    expect(result[87]).toBeGreaterThan(0); // C8
  });

  it('6:3 style produces wider bass stretch than 4:2', () => {
    const profile = PIANO_B_PROFILES[PIANO_PROFILE_NAMES.SPINET];
    const result42 = calculateRailsbackOffset(profile, '4:2');
    const result63 = calculateRailsbackOffset(profile, '6:3');

    // 6:3 is a bass-register technique (wider partial span) — it widens bass
    // stretch vs 4:2. Treble is not asserted: with span=19 the upward
    // propagation from A4 cannot chain through sub-A4 anchors, so 6:3 treble
    // stretch is not meaningfully wider than 4:2.
    expect(Math.abs(result63[0])).toBeGreaterThan(Math.abs(result42[0]));
  });

  it('concert-grand uses 6:3 in bass and 4:2 in treble', () => {
    const profile = PIANO_B_PROFILES[PIANO_PROFILE_NAMES.CONCERT_GRAND];
    const resultCG = calculateRailsbackOffset(profile, 'concert-grand');
    const result42 = calculateRailsbackOffset(profile, '4:2');
    const result63 = calculateRailsbackOffset(profile, '6:3');

    const bassIdx = 10;
    expect(Math.abs(resultCG[bassIdx])).toBeGreaterThanOrEqual(
      Math.abs(result42[bassIdx]),
    );

    const trebleIdx = 70;
    expect(Math.abs(resultCG[trebleIdx] - result42[trebleIdx])).toBeLessThanOrEqual(
      Math.abs(resultCG[trebleIdx] - result63[trebleIdx]),
    );
  });

  it('zero B values produce zero stretch', () => {
    const bValues = new Array(NUM_KEYS).fill(0);
    const result = calculateRailsbackOffset(bValues, '4:2');
    for (let i = 0; i < NUM_KEYS; i++) {
      expect(Math.abs(result[i])).toBeLessThan(0.001);
    }
  });

  it('different profiles produce different curves', () => {
    const concertGrand = calculateRailsbackOffset(
      PIANO_B_PROFILES[PIANO_PROFILE_NAMES.CONCERT_GRAND],
      '4:2',
    );
    const spinet = calculateRailsbackOffset(
      PIANO_B_PROFILES[PIANO_PROFILE_NAMES.SPINET],
      '4:2',
    );

    expect(Math.abs(spinet[0])).toBeGreaterThan(Math.abs(concertGrand[0]));
    expect(spinet[87]).toBeGreaterThan(concertGrand[87]);
  });

  it('pure-12ths uses wider span', () => {
    const profile = PIANO_B_PROFILES[PIANO_PROFILE_NAMES.UPRIGHT];
    const result12 = calculateRailsbackOffset(profile, '4:2');
    const resultPure12 = calculateRailsbackOffset(profile, 'pure-12ths');

    expect(resultPure12[0]).not.toBeCloseTo(result12[0], 2);
  });
});

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

describe('gradeSampleMeasurements', () => {
  it('gives F for no measured samples', () => {
    const result = gradeSampleMeasurements([]);
    expect(result.grade).toBe('F');
  });

  it('gives A+ for perfect measurements', () => {
    const samples = [
      {
        noteName: 'A4',
        midi: 69,
        trueB: 0.001,
        measuredB: 0.001,
        error: 0,
        relativeErrorPct: 0,
        captured: true,
      },
    ];
    const result = gradeSampleMeasurements(samples);
    expect(result.meanRelativeErrorPct).toBe(0);
    expect(result.grade).toBe('A+');
  });

  it('gives correct grade for known error', () => {
    const samples = [
      {
        noteName: 'A4',
        midi: 69,
        trueB: 0.001,
        measuredB: 0.00108,
        error: 0.00008,
        relativeErrorPct: 8,
        captured: true,
      },
    ];
    const result = gradeSampleMeasurements(samples);
    expect(result.meanRelativeErrorPct).toBe(8);
    expect(result.grade).toBe('B');
  });

  it('skips uncaptured samples', () => {
    const samples = [
      {
        noteName: 'A4',
        midi: 69,
        trueB: 0.001,
        measuredB: null,
        error: null,
        relativeErrorPct: null,
        captured: false,
      },
      {
        noteName: 'A5',
        midi: 81,
        trueB: 0.002,
        measuredB: 0.002,
        error: 0,
        relativeErrorPct: 0,
        captured: true,
      },
    ];
    const result = gradeSampleMeasurements(samples);
    expect(result.meanRelativeErrorPct).toBe(0);
    expect(result.grade).toBe('A+');
  });
});
