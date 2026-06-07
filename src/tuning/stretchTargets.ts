import { partialFreq } from '@/audio/partialFreq';
import { midiToFreq } from '@/model/pianoNotes';
import {
  MIDI_A0,
  NUM_KEYS,
  StretchStrategy,
  TuningSimResults,
  TuningSimNoteResult,
  GRADE_THRESHOLDS,
} from '@/types';

// ---------------------------------------------------------------------------
// Railsback deviation from equal temperament (cents)
// Source: Railsback O.L., "Scale Temperament as Applied to Piano Tuning",
// Journal of the Acoustical Society of America, 1938.
// Values interpolated to 88 keys (A0=21 to C8=108).
// Bass stretched flat, treble stretched sharp, crossing near C4.
// ---------------------------------------------------------------------------

const RAILSBACK_DEVIATION_CENTS: readonly number[] = [
  // A0 (MIDI 21) through C8 (MIDI 108)
  // Based on Railsback (1938), Martin & Ward (1961) published measurements,
  // and Schuck & Young (1943) inharmonicity analysis.
  // Bass: ~-30¢ flat. Temperament region (E3-G4): 0¢. Treble: ~+13.5¢ sharp.
  -30.0, -28.5, -27.0, -25.5, -24.0, -22.5, -21.0, -19.5,
  -18.0, -16.5, -15.0, -13.5, -12.0, -10.8,  -9.5,  -8.5,
   -7.5,  -6.5,  -5.5,  -4.5,  -3.8,  -3.0,  -2.5,  -2.0,
   -1.5,  -1.2,  -0.8,  -0.5,  -0.3,  -0.2,  -0.1,   0.0,
    0.0,   0.0,   0.0,   0.0,   0.0,   0.0,   0.0,   0.0,
    0.0,   0.0,   0.0,   0.0,   0.0,   0.0,   0.0,   0.1,
    0.2,   0.3,   0.4,   0.5,   0.7,   0.9,   1.1,   1.3,
    1.6,   1.9,   2.2,   2.5,   2.9,   3.3,   3.7,   4.0,
    4.4,   4.8,   5.3,   5.8,   6.2,   6.7,   7.2,   7.7,
    8.2,   8.7,   9.2,   9.7,  10.1,  10.5,  10.9,  11.2,
   11.5,  11.8,  12.1,  12.4,  12.7,  13.0,  13.3,  13.5,
] as const;

// ---------------------------------------------------------------------------
// Compute stretch targets
// ---------------------------------------------------------------------------

/**
 * Compute 88 target cents offsets for the given stretch strategy.
 * Index 0 = A0 (MIDI 21), index 87 = C8 (MIDI 108).
 */
export function computeTargets(
  strategy: StretchStrategy,
  bProfile: number[],
): number[] {
  switch (strategy.kind) {
    case 'equal':
      return new Array(NUM_KEYS).fill(0);

    case 'railsback':
      return [...RAILSBACK_DEVIATION_CENTS];

    case 'partial_align': {
      const targets: number[] = [];
      for (let i = 0; i < NUM_KEYS; i++) {
        const midi = MIDI_A0 + i;
        const nextOctave = midi + 12;
        if (nextOctave > 108) {
          // No note an octave above C8 — fall back to 0
          targets.push(0);
          continue;
        }
        const f1 = midiToFreq(midi);
        const B = bProfile[i];
        const targetFreq = midiToFreq(nextOctave);
        const partialFreqValue = partialFreq(f1, B, strategy.partial);
        // Cents offset needed so that partial N aligns with next octave fundamental
        const cents = 1200 * Math.log2(targetFreq / partialFreqValue);
        targets.push(cents);
      }
      return targets;
    }
  }
}

// ---------------------------------------------------------------------------
// Compute game results (scoring)
// ---------------------------------------------------------------------------

function assignGrade(meanAbsError: number): string {
  if (meanAbsError < GRADE_THRESHOLDS.A_PLUS) return 'A+';
  if (meanAbsError < GRADE_THRESHOLDS.A) return 'A';
  if (meanAbsError < GRADE_THRESHOLDS.B) return 'B';
  if (meanAbsError < GRADE_THRESHOLDS.C) return 'C';
  if (meanAbsError < GRADE_THRESHOLDS.D) return 'D';
  return 'F';
}

/**
 * Score committed notes against stretch targets.
 * Only committed notes are included in results.
 */
export function computeResults(
  userCommits: Map<number, number>,
  targets: number[],
): TuningSimResults {
  const notes: TuningSimNoteResult[] = [];

  for (const [midi, userCents] of userCommits) {
    const idx = midi - MIDI_A0;
    if (idx < 0 || idx >= NUM_KEYS) continue;
    const targetCents = targets[idx];
    notes.push({
      midiNote: midi,
      userCents,
      targetCents,
      error: userCents - targetCents,
    });
  }

  // Sort by MIDI note for display
  notes.sort((a, b) => a.midiNote - b.midiNote);

  const errors = notes.map((n) => n.error);
  const meanAbsoluteError =
    errors.length > 0
      ? errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length
      : 0;

  const standardDeviation =
    errors.length > 0
      ? Math.sqrt(
          errors.reduce((sum, e) => sum + (Math.abs(e) - meanAbsoluteError) ** 2, 0) /
            errors.length,
        )
      : 0;

  const withinHalfCent = errors.filter((e) => Math.abs(e) < 0.5).length;
  const withinOneCent = errors.filter((e) => Math.abs(e) < 1.0).length;
  const withinTwoCents = errors.filter((e) => Math.abs(e) < 2.0).length;

  return {
    notes,
    meanAbsoluteError,
    standardDeviation,
    withinHalfCent,
    withinOneCent,
    withinTwoCents,
    grade: assignGrade(meanAbsoluteError),
  };
}
