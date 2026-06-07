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
  ATTACK_MS: 0.005,
  RELEASE_MS: 0.05,
} as const;

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
