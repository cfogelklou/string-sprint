// ---------------------------------------------------------------------------
// MIDI constants
// ---------------------------------------------------------------------------

export const MIDI_A0 = 21;
export const MIDI_C8 = 108;
export const NUM_KEYS = 88;
export const DEFAULT_A4 = 440;

// ---------------------------------------------------------------------------
// Breakpoints
// ---------------------------------------------------------------------------

export const BREAKPOINTS = {
  MOBILE_PORTRAIT: 480,
  MOBILE_LANDSCAPE: 960,
} as const;

// ---------------------------------------------------------------------------
// Piano key
// ---------------------------------------------------------------------------

export interface PianoKey {
  midiNote: number;
  name: string;
  isBlack: boolean;
  fundamentalFreq: number;
  B: number;
  centsOffset: number;
}

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

export const AUDIO_CONFIG = {
  MAX_PARTIALS: 10,
  MAX_SIMULTANEOUS_TONES: 4,
  PARTIAL_AMPLITUDE_EXPONENT: 1.2,
  ATTACK_S: 0.005,
  RELEASE_S: 0.05,
  /** Damper release time in seconds — how fast the sound fades when key is released. */
  DAMPER_RELEASE_S: 0.200,
  /** Double-decay: prompt sound amplitude level (-14dB). Fast vertical vibration drop. */
  PROMPT_LEVEL: 0.2,
  /** Double-decay: fraction of t60 spent in prompt decay. */
  PROMPT_FRACTION: 0.1,
  /** Double-decay: aftersound floor (-60dB). */
  AFTERSOUND_FLOOR: 0.001,
} as const;

/**
 * Per-register envelope parameters for realistic piano decay.
 * t60 = time for sound to decay to -60dB (inaudible) in seconds.
 * attackMs = hammer strike rise time in seconds (field name is historical).
 * Values from acoustic piano measurements (KTH, Askenfelt).
 */
export const REGISTER_ENVELOPE_TABLE = [
  { midiLo: 21, midiHi: 35,  t60: 37,   attackMs: 0.004 },  // Low bass A0-B1
  { midiLo: 36, midiHi: 47,  t60: 22,   attackMs: 0.003 },  // Mid bass C2-B2
  { midiLo: 48, midiHi: 59,  t60: 15,   attackMs: 0.002 },  // Tenor C3-B3
  { midiLo: 60, midiHi: 71,  t60: 11,   attackMs: 0.0015 }, // Midrange C4-B4
  { midiLo: 72, midiHi: 83,  t60: 5,    attackMs: 0.001 },  // Treble C5-B6
  { midiLo: 84, midiHi: 108, t60: 1.5,  attackMs: 0.0005 }, // High treble C7-C8
] as const;

export interface ToneConfig {
  frequency: number;
  B: number;
  centsOffset: number;
  numPartials: number;
  sustainDuration: number;
}

// ---------------------------------------------------------------------------
// B coefficient profiles
// ---------------------------------------------------------------------------

export const PIANO_PROFILE_NAMES = {
  CONCERT_GRAND: 'concertGrand',
  STUDIO_GRAND: 'studioGrand',
  BABY_GRAND: 'babyGrand',
  UPRIGHT: 'upright',
  CONSOLE: 'console',
  SPINET: 'spinet',
} as const;

export type PianoProfileName =
  (typeof PIANO_PROFILE_NAMES)[keyof typeof PIANO_PROFILE_NAMES];

// ---------------------------------------------------------------------------
// Rigaud model
// ---------------------------------------------------------------------------

export interface RigaudParams {
  s_B: number;
  y_B: number;
  s_T: number;
  y_T: number;
}

// ---------------------------------------------------------------------------
// Tuning simulation game
// ---------------------------------------------------------------------------

export type TuningSimPhase = 'idle' | 'playing' | 'revealed';

export type StretchStrategy =
  | { kind: 'equal' }
  | { kind: 'railsback' }
  | { kind: 'partial_align'; partial: number };

export interface TuningSimNoteResult {
  midiNote: number;
  userCents: number;
  targetCents: number;
  error: number;
}

export interface TuningSimResults {
  notes: TuningSimNoteResult[];
  meanAbsoluteError: number;
  standardDeviation: number;
  withinHalfCent: number;
  withinOneCent: number;
  withinTwoCents: number;
  grade: string;
}

export const GRADE_THRESHOLDS = {
  A_PLUS: 0.2,
  A: 0.5,
  B: 1.0,
  C: 2.0,
  D: 3.5,
} as const;

export const TUNING_SIM_CENTS_RANGE = 50;

// ---------------------------------------------------------------------------
// PTA (Piano Tuning Assistant) testing mode
// ---------------------------------------------------------------------------

/** Octave alignment style for PTA stretch curve generation. */
export type OctaveStyle = '4:2' | '6:3' | 'pure-12ths' | 'concert-grand';

/** PTA wizard step. */
export type PTAStep = 'setup' | 'bridge-break' | 'measure' | 'review' | 'results';

/** Bridge break defaults per piano type (MIDI note numbers).
 *  Smaller piano → higher bridge break (wound strings extend further). */
export const PTA_BRIDGE_BREAK_DEFAULTS: Record<PianoProfileName, number> = {
  [PIANO_PROFILE_NAMES.CONCERT_GRAND]: MIDI_A0 + 23, // MIDI 44 (G#2)
  [PIANO_PROFILE_NAMES.STUDIO_GRAND]: MIDI_A0 + 24,  // MIDI 45 (A2)
  [PIANO_PROFILE_NAMES.BABY_GRAND]: MIDI_A0 + 25,    // MIDI 46 (A#2)
  [PIANO_PROFILE_NAMES.UPRIGHT]: MIDI_A0 + 26,       // MIDI 47 (B2)
  [PIANO_PROFILE_NAMES.CONSOLE]: MIDI_A0 + 27,       // MIDI 48 (C3)
  [PIANO_PROFILE_NAMES.SPINET]: MIDI_A0 + 29,        // MIDI 50 (D3)
} as const;

/** Sample notes for B measurement (MIDI note numbers). */
export const PTA_SAMPLE_NOTES = [
  { name: 'A1', midi: 33 },
  { name: 'E2', midi: 40 },
  { name: 'B2', midi: 47 },
  { name: 'E3', midi: 52 },
  { name: 'A3', midi: 57 },
  { name: 'A4', midi: 69 },
  { name: 'A5', midi: 81 },
  { name: 'A6', midi: 93 },
] as const;

/** Partial alignment configuration per octave style. */
export const OCTAVE_ALIGNMENTS: Record<
  OctaveStyle,
  { lowerPartial: number; upperPartial: number; semitoneSpan: number }
> = {
  '4:2': { lowerPartial: 4, upperPartial: 2, semitoneSpan: 12 },
  '6:3': { lowerPartial: 6, upperPartial: 3, semitoneSpan: 12 },
  'pure-12ths': { lowerPartial: 3, upperPartial: 1, semitoneSpan: 19 },
  'concert-grand': { lowerPartial: 4, upperPartial: 2, semitoneSpan: 12 },
} as const;

/** A single sample note measurement in PTA mode. */
export interface PTASampleMeasurement {
  /** Note name (e.g., "A1"). */
  noteName: string;
  /** MIDI note number. */
  midi: number;
  /** True B coefficient from the active profile (ground truth). */
  trueB: number;
  /** User's measured B coefficient (entered from Strobopro). Null if not yet measured. */
  measuredB: number | null;
  /** Absolute error |measuredB - trueB|. Null if not yet measured. */
  error: number | null;
  /** Relative error as percentage. Null if not yet measured. */
  relativeErrorPct: number | null;
  /** Whether this sample has been measured. */
  captured: boolean;
}

/** B value input validation bounds. */
export const B_INPUT_MIN = 0;
export const B_INPUT_MAX = 0.1;

/** PTA grading thresholds for sample measurement (mean relative B error %). */
export const PTA_MEASUREMENT_GRADE_THRESHOLDS = {
  A_PLUS: 2,
  A: 5,
  B: 10,
  C: 15,
  D: 25,
} as const;
