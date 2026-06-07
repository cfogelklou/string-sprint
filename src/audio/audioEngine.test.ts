import { describe, it, expect } from 'vitest';
import { partialFreq, centsToFreqRatio } from './partialFreq';
import { partialAmplitude } from './envelope';
import { AUDIO_CONFIG } from '@/types/index';

// ---------------------------------------------------------------------------
// Named test constants
// ---------------------------------------------------------------------------

const A4_FREQ = 440 as const;
const B_TYPICAL_A4 = 0.0004 as const;
const B_ZERO = 0 as const;
const CENTS_PER_OCTAVE = 1200 as const;

// ---------------------------------------------------------------------------
// partialFreq
// ---------------------------------------------------------------------------

describe('partialFreq', () => {
  it('returns integer harmonics when B=0', () => {
    expect(partialFreq(A4_FREQ, B_ZERO, 1)).toBeCloseTo(440, 10);
    expect(partialFreq(A4_FREQ, B_ZERO, 2)).toBeCloseTo(880, 10);
    expect(partialFreq(A4_FREQ, B_ZERO, 3)).toBeCloseTo(1320, 10);
    expect(partialFreq(A4_FREQ, B_ZERO, 4)).toBeCloseTo(1760, 10);
  });

  it('returns exact f1 when n=1 regardless of B', () => {
    expect(partialFreq(A4_FREQ, 0, 1)).toBeCloseTo(440, 10);
    expect(partialFreq(A4_FREQ, 0.001, 1)).toBeCloseTo(440, 10);
    expect(partialFreq(A4_FREQ, 0.1, 1)).toBeCloseTo(440, 10);
    expect(partialFreq(A4_FREQ, 1.0, 1)).toBeCloseTo(440, 10);
  });

  it('sharpens higher partials when B>0', () => {
    const f2 = partialFreq(A4_FREQ, B_TYPICAL_A4, 2);
    // Must be above the ideal 880 Hz
    expect(f2).toBeGreaterThan(880);
    // But only slightly above (inharmonicity is small)
    expect(f2).toBeLessThan(885);
  });

  it('increases sharpening with higher B', () => {
    const f6_lowB = partialFreq(A4_FREQ, 0.0001, 6);
    const f6_highB = partialFreq(A4_FREQ, 0.01, 6);
    expect(f6_highB).toBeGreaterThan(f6_lowB);
  });

  it('increases sharpening with higher partial number', () => {
    const f2 = partialFreq(A4_FREQ, B_TYPICAL_A4, 2);
    const f3 = partialFreq(A4_FREQ, B_TYPICAL_A4, 3);
    const f6 = partialFreq(A4_FREQ, B_TYPICAL_A4, 6);

    // Deviation from ideal grows with partial number
    const dev2 = f2 - 2 * A4_FREQ;
    const dev3 = f3 - 3 * A4_FREQ;
    const dev6 = f6 - 6 * A4_FREQ;

    expect(dev6).toBeGreaterThan(dev3);
    expect(dev3).toBeGreaterThan(dev2);
  });

  it('matches strobopro known value: A4 B=0.0004 partial 2 ~880.53 Hz', () => {
    const f2 = partialFreq(A4_FREQ, B_TYPICAL_A4, 2);
    // Hand-computed: 2*440*sqrt((1+0.0004*4)/(1+0.0004))
    //   = 880 * sqrt(1.0016/1.0004)
    //   ≈ 880.528...
    expect(f2).toBeCloseTo(880.528, 1);
  });

  it('matches strobopro known value: A4 B=0.0004 partial 6', () => {
    const f6 = partialFreq(A4_FREQ, B_TYPICAL_A4, 6);
    // 6*440*sqrt((1+0.0004*36)/(1+0.0004))
    //   = 2640*sqrt(1.0144/1.0004)
    //   ≈ 2640*1.00698...
    //   ≈ 2658.43
    expect(f6).toBeCloseTo(2658.43, 0);
  });
});

// ---------------------------------------------------------------------------
// centsToFreqRatio
// ---------------------------------------------------------------------------

describe('centsToFreqRatio', () => {
  it('returns 1.0 for 0 cents', () => {
    expect(centsToFreqRatio(0)).toBeCloseTo(1.0, 10);
  });

  it('returns 2.0 for +1200 cents (one octave up)', () => {
    expect(centsToFreqRatio(CENTS_PER_OCTAVE)).toBeCloseTo(2.0, 10);
  });

  it('returns 0.5 for -1200 cents (one octave down)', () => {
    expect(centsToFreqRatio(-CENTS_PER_OCTAVE)).toBeCloseTo(0.5, 10);
  });

  it('returns sqrt(2) for +600 cents (tritone)', () => {
    expect(centsToFreqRatio(600)).toBeCloseTo(Math.SQRT2, 10);
  });

  it('round-trips with inverse: ratio * centsToFreqRatio(-cents) = 1', () => {
    const cents = 347;
    const ratio = centsToFreqRatio(cents);
    const inverse = centsToFreqRatio(-cents);
    expect(ratio * inverse).toBeCloseTo(1.0, 10);
  });
});

// ---------------------------------------------------------------------------
// partialAmplitude
// ---------------------------------------------------------------------------

describe('partialAmplitude', () => {
  it('returns 1.0 for n=1 (fundamental)', () => {
    expect(partialAmplitude(1)).toBeCloseTo(1.0, 10);
  });

  it('decreases monotonically for higher partial numbers', () => {
    const amp1 = partialAmplitude(1);
    const amp2 = partialAmplitude(2);
    const amp3 = partialAmplitude(3);
    const amp5 = partialAmplitude(5);
    const amp10 = partialAmplitude(10);

    expect(amp2).toBeLessThan(amp1);
    expect(amp3).toBeLessThan(amp2);
    expect(amp5).toBeLessThan(amp3);
    expect(amp10).toBeLessThan(amp5);
  });

  it('uses AUDIO_CONFIG.PARTIAL_AMPLITUDE_EXPONENT', () => {
    const n = 5;
    const expected = 1 / Math.pow(n, AUDIO_CONFIG.PARTIAL_AMPLITUDE_EXPONENT);
    expect(partialAmplitude(n)).toBeCloseTo(expected, 10);
  });

  it('returns a value below 0.5 for n=2', () => {
    // 1 / 2^1.2 ≈ 0.435
    expect(partialAmplitude(2)).toBeLessThan(0.5);
    expect(partialAmplitude(2)).toBeGreaterThan(0.4);
  });

  it('returns a very small value for high partials', () => {
    expect(partialAmplitude(10)).toBeLessThan(0.1);
  });
});
