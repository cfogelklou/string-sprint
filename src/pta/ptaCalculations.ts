/**
 * PTA (Piano Tuning Assistant) calculation engine.
 *
 * Generates the "expected stretch curve" for the review step and scores
 * sample note measurements. All internal indexing uses 0-based array
 * indices (midi - MIDI_A0).
 *
 * What this does NOT do (that's strobopro's job):
 *   - Interpolate B coefficients from sparse measurements (we have all 88)
 *   - FFT-based B measurement (we already know the true B values)
 */

import {
  MIDI_A0,
  NUM_KEYS,
  OCTAVE_ALIGNMENTS,
  PTA_MEASUREMENT_GRADE_THRESHOLDS,
  type OctaveStyle,
  type PTASampleMeasurement,
} from '@/types';
import { midiToFreq } from '@/model/pianoNotes';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** MIDI note number for A4 (reference note). */
const MIDI_A4 = 69;

/** 0-based array index for A4. */
const INDEX_A4 = MIDI_A4 - MIDI_A0; // 48

// ---------------------------------------------------------------------------
// Stretch Curve Generation
// ---------------------------------------------------------------------------

/** Partial alignment configuration. */
interface OctaveAlignment {
  lowerPartial: number;
  upperPartial: number;
  semitoneSpan: number;
}

/**
 * Compute target frequency for an upper note by aligning partials.
 * f_upper = (n/m) × f_lower × √((1 + B_L×n²)(1 + B_U)) / √((1 + B_L)(1 + B_U×m²))
 */
function computeTargetFrequency(
  fLower: number,
  bLower: number,
  bUpper: number,
  alignment: OctaveAlignment,
): number {
  const { lowerPartial: n, upperPartial: m } = alignment;
  const numerator =
    (n / m) * fLower * Math.sqrt((1 + bLower * n * n) * (1 + bUpper));
  const denominator = Math.sqrt(
    (1 + bLower) * (1 + bUpper * m * m),
  );
  return numerator / denominator;
}

/** Inverse: solve for lower note's fundamental given upper note's frequency. */
function solveForLowerFrequency(
  fUpper: number,
  bLower: number,
  bUpper: number,
  alignment: OctaveAlignment,
): number {
  const { lowerPartial: n, upperPartial: m } = alignment;
  const numerator =
    (m / n) * fUpper * Math.sqrt((1 + bUpper * m * m) * (1 + bLower));
  const denominator = Math.sqrt(
    (1 + bUpper) * (1 + bLower * n * n),
  );
  return numerator / denominator;
}

/** Get octave alignment for a given register and style. */
function getAlignment(
  arrayIndex: number,
  style: OctaveStyle,
): OctaveAlignment {
  if (style === 'concert-grand') {
    // Below strobopro piano key 28 (1-based) = array index 27: use 6:3
    // At or above: use 4:2
    return arrayIndex < 27
      ? OCTAVE_ALIGNMENTS['6:3']
      : OCTAVE_ALIGNMENTS['4:2'];
  }
  return OCTAVE_ALIGNMENTS[style];
}

/**
 * Generate a Railsback-style stretch tuning curve from B values.
 *
 * Propagates semitone-by-semitone outward from A4, computing target
 * frequencies by aligning partials of notes one octave apart.
 * Used in the PTA review step to show "what strobopro's curve should look like."
 *
 * @param bValues - 88 B values from PIANO_B_PROFILES (index 0 = A0)
 * @param octaveStyle - Which partial alignment to use
 * @param referenceFreq - Reference frequency for A4 (default 440 Hz)
 * @returns 88 cents offsets from equal temperament (index 0 = A0)
 */
export function calculateRailsbackOffset(
  bValues: number[],
  octaveStyle: OctaveStyle,
  referenceFreq: number = 440,
): number[] {
  const centsOffset = new Array(NUM_KEYS).fill(0);
  const fStretched = new Array(NUM_KEYS).fill(0);

  // Initialize reference note A4
  fStretched[INDEX_A4] = referenceFreq;
  centsOffset[INDEX_A4] = 0;

  const span = 12; // Always octave-based propagation

  // Propagate upward (toward treble) semitone by semitone
  for (let i = INDEX_A4 + 1; i < NUM_KEYS; i++) {
    const anchorIdx = i - span;
    if (anchorIdx < 0 || fStretched[anchorIdx] === 0) {
      fStretched[i] = midiToFreq(MIDI_A0 + i, referenceFreq);
      centsOffset[i] = 0;
      continue;
    }

    const lowerFreq = fStretched[anchorIdx];
    const bLower = bValues[anchorIdx];
    const bUpper = bValues[i];
    const alignment = getAlignment(i, octaveStyle);

    const fTarget = computeTargetFrequency(
      lowerFreq,
      bLower,
      bUpper,
      alignment,
    );
    fStretched[i] = fTarget;
    const etFreq = midiToFreq(MIDI_A0 + i, referenceFreq);
    centsOffset[i] = 1200 * Math.log2(fTarget / etFreq);
  }

  // Propagate downward (toward bass) semitone by semitone
  for (let i = INDEX_A4 - 1; i >= 0; i--) {
    const anchorIdx = i + span;
    if (anchorIdx >= NUM_KEYS || fStretched[anchorIdx] === 0) {
      fStretched[i] = midiToFreq(MIDI_A0 + i, referenceFreq);
      centsOffset[i] = 0;
      continue;
    }

    const upperFreq = fStretched[anchorIdx];
    const bLower = bValues[i];
    const bUpper = bValues[anchorIdx];
    const alignment = getAlignment(i, octaveStyle);

    const fTarget = solveForLowerFrequency(
      upperFreq,
      bLower,
      bUpper,
      alignment,
    );
    fStretched[i] = fTarget;
    const etFreq = midiToFreq(MIDI_A0 + i, referenceFreq);
    centsOffset[i] = 1200 * Math.log2(fTarget / etFreq);
  }

  return centsOffset;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Grade sample note measurements.
 * @param samples - Array of measurement results with relativeErrorPct populated
 * @returns Object with mean relative error % and letter grade
 */
export function gradeSampleMeasurements(samples: PTASampleMeasurement[]): {
  meanRelativeErrorPct: number;
  grade: string;
} {
  const measured = samples.filter((s) => s.captured && s.relativeErrorPct !== null);
  if (measured.length === 0) {
    return { meanRelativeErrorPct: 100, grade: 'F' };
  }

  const meanRelativeErrorPct =
    measured.reduce((sum, s) => sum + (s.relativeErrorPct ?? 0), 0) /
    measured.length;

  const t = PTA_MEASUREMENT_GRADE_THRESHOLDS;
  let grade: string;
  if (meanRelativeErrorPct < t.A_PLUS) grade = 'A+';
  else if (meanRelativeErrorPct < t.A) grade = 'A';
  else if (meanRelativeErrorPct < t.B) grade = 'B';
  else if (meanRelativeErrorPct < t.C) grade = 'C';
  else if (meanRelativeErrorPct < t.D) grade = 'D';
  else grade = 'F';

  return { meanRelativeErrorPct, grade };
}
