import { PianoProfileName, RigaudParams, PIANO_PROFILE_NAMES, MIDI_A0, MIDI_C8 } from '@/types';
import { withSubA0Plateau } from '@/bCoefficients/profiles';

export const DEFAULT_RIGAUD_PARAMS: Record<PianoProfileName, RigaudParams> = {
  [PIANO_PROFILE_NAMES.CONCERT_GRAND]: { s_B: -0.150, y_B: -5.00, s_T: 0.0926, y_T: -15.5223 },
  [PIANO_PROFILE_NAMES.STUDIO_GRAND]: { s_B: -0.120, y_B: -5.00, s_T: 0.0926, y_T: -15.1168 },
  [PIANO_PROFILE_NAMES.BABY_GRAND]: { s_B: -0.100, y_B: -5.00, s_T: 0.0926, y_T: -14.8291 },
  [PIANO_PROFILE_NAMES.UPRIGHT]: { s_B: -0.090, y_B: -4.80, s_T: 0.0926, y_T: -13.9128 },
  [PIANO_PROFILE_NAMES.CONSOLE]: { s_B: -0.080, y_B: -4.50, s_T: 0.0926, y_T: -13.5074 },
  [PIANO_PROFILE_NAMES.SPINET]: { s_B: -0.070, y_B: -4.00, s_T: 0.0926, y_T: -12.9967 },
  [PIANO_PROFILE_NAMES.OTHER]: { s_B: -0.090, y_B: -4.80, s_T: 0.0926, y_T: -13.9128 },
  [PIANO_PROFILE_NAMES.IDEAL]: { s_B: 0, y_B: 0, s_T: 0, y_T: 0 },
};

export function rigaudB(midiNote: number, params: RigaudParams): number {
  return Math.exp(params.s_B * midiNote + params.y_B) +
         Math.exp(params.s_T * midiNote + params.y_T);
}

export function generateProfile(params: RigaudParams): number[] {
  // Generate the theoretical model only for real keys A0..C8 (the Rigaud
  // dual-exponential is not valid below A0 — CLAUDE.md B-coefficient rule),
  // then share the empirical-table plateau helper for the sub-A0 keys.
  const raw: number[] = [];
  for (let midiNote = MIDI_A0; midiNote <= MIDI_C8; midiNote++) {
    raw.push(rigaudB(midiNote, params));
  }
  return withSubA0Plateau(raw);
}
