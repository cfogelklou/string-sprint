import { AUDIO_CONFIG, REGISTER_ENVELOPE_TABLE } from '@/types/index';

/**
 * Return amplitude for the nth partial, decreasing with harmonic number.
 * A(n) = 1 / n^PARTIAL_AMPLITUDE_EXPONENT
 */
export function partialAmplitude(n: number): number {
  return 1 / Math.pow(n, AUDIO_CONFIG.PARTIAL_AMPLITUDE_EXPONENT);
}

/**
 * Create a GainNode with attack-sustain-release envelope for anti-click.
 * Attack: 5ms linear ramp from 0 to peakGain.
 * Release: 50ms linear ramp from peakGain to 0.
 */
export function createEnvelope(
  audioCtx: AudioContext,
  duration: number,
  peakGain: number,
): GainNode {
  const gainNode = audioCtx.createGain();
  const now = audioCtx.currentTime;

  const attackEnd = now + AUDIO_CONFIG.ATTACK_MS;
  const releaseStart = now + duration - AUDIO_CONFIG.RELEASE_MS;

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(peakGain, attackEnd);
  gainNode.gain.setValueAtTime(peakGain, releaseStart);
  gainNode.gain.linearRampToValueAtTime(0, now + duration);

  return gainNode;
}

/**
 * Look up register-specific envelope parameters for a MIDI note.
 * Returns { t60, attackMs } for the matching register.
 * Falls back to last entry (high treble) for out-of-range notes.
 */
export function getRegisterEnvelope(
  midiNote: number,
): { t60: number; attackMs: number } {
  for (const entry of REGISTER_ENVELOPE_TABLE) {
    if (midiNote >= entry.midiLo && midiNote <= entry.midiHi) {
      return { t60: entry.t60, attackMs: entry.attackMs };
    }
  }
  const last = REGISTER_ENVELOPE_TABLE[REGISTER_ENVELOPE_TABLE.length - 1];
  return { t60: last.t60, attackMs: last.attackMs };
}

/** Duration of the trailing silence ramp after exponential decay (seconds). */
const TRAILING_SILENCE_S = 0.05;

/**
 * Schedule a realistic piano envelope on a gain AudioParam:
 * 1. Attack: linear ramp 0 → 1.0
 * 2. Decay: exponential ramp 1.0 → DECAY_FLOOR over t60 seconds
 * 3. Trailing: linear ramp DECAY_FLOOR → 0 (silences residual)
 *
 * Returns total envelope duration in seconds (including trailing ramp).
 */
export function scheduleDecayEnvelope(
  gainParam: AudioParam,
  now: number,
  midiNote: number,
): number {
  const { t60, attackMs } = getRegisterEnvelope(midiNote);
  const floor = AUDIO_CONFIG.DECAY_FLOOR;

  // Attack: linear ramp from 0 to peak
  const attackEnd = now + attackMs;
  gainParam.setValueAtTime(0, now);
  gainParam.linearRampToValueAtTime(1.0, attackEnd);

  // Exponential decay to -40dB floor
  const decayEnd = attackEnd + t60;
  gainParam.exponentialRampToValueAtTime(floor, decayEnd);

  // Trailing silence ramp (exponentialRamp can't target 0)
  gainParam.linearRampToValueAtTime(0, decayEnd + TRAILING_SILENCE_S);

  return attackMs + t60 + TRAILING_SILENCE_S;
}
