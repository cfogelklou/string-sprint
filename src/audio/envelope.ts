import { AUDIO_CONFIG } from '@/types/index';

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
