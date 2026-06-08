import { describe, it, expect } from 'vitest';
import { getRegisterEnvelope, scheduleDecayEnvelope, TRAILING_SILENCE_S } from './envelope';
import { AUDIO_CONFIG, REGISTER_ENVELOPE_TABLE } from '@/types/index';

// ---------------------------------------------------------------------------
// getRegisterEnvelope
// ---------------------------------------------------------------------------

describe('getRegisterEnvelope', () => {
  it('returns correct entry for MIDI 21 (A0 — low bass)', () => {
    const env = getRegisterEnvelope(21);
    expect(env.t60).toBe(37);
    expect(env.attackMs).toBe(0.004);
  });

  it('returns correct entry for MIDI 60 (C4 — midrange)', () => {
    const env = getRegisterEnvelope(60);
    expect(env.t60).toBe(11);
    expect(env.attackMs).toBe(0.0015);
  });

  it('returns correct entry for MIDI 108 (C8 — high treble)', () => {
    const env = getRegisterEnvelope(108);
    expect(env.t60).toBe(1.5);
    expect(env.attackMs).toBe(0.0005);
  });

  it('returns high treble fallback for out-of-range high MIDI', () => {
    const env = getRegisterEnvelope(127);
    const last = REGISTER_ENVELOPE_TABLE[REGISTER_ENVELOPE_TABLE.length - 1];
    expect(env.t60).toBe(last.t60);
    expect(env.attackMs).toBe(last.attackMs);
  });

  it('returns high treble fallback for out-of-range low MIDI', () => {
    const env = getRegisterEnvelope(0);
    const last = REGISTER_ENVELOPE_TABLE[REGISTER_ENVELOPE_TABLE.length - 1];
    expect(env.t60).toBe(last.t60);
  });

  it('covers every register boundary', () => {
    // Lo of each range
    for (const entry of REGISTER_ENVELOPE_TABLE) {
      const env = getRegisterEnvelope(entry.midiLo);
      expect(env.t60).toBe(entry.t60);
      expect(env.attackMs).toBe(entry.attackMs);
    }
  });
});

// ---------------------------------------------------------------------------
// scheduleDecayEnvelope
// ---------------------------------------------------------------------------

describe('scheduleDecayEnvelope', () => {
  /** Minimal AudioParam mock that records scheduling calls. */
  function createMockAudioParam(): {
    param: AudioParam;
    calls: { method: string; args: number[] }[];
  } {
    const calls: { method: string; args: number[] }[] = [];

    const param = {
      setValueAtTime(value: number, time: number) {
        calls.push({ method: 'setValueAtTime', args: [value, time] });
      },
      linearRampToValueAtTime(value: number, time: number) {
        calls.push({ method: 'linearRampToValueAtTime', args: [value, time] });
      },
      exponentialRampToValueAtTime(value: number, time: number) {
        calls.push({ method: 'exponentialRampToValueAtTime', args: [value, time] });
      },
    } as unknown as AudioParam;

    return { param, calls };
  }

  it('returns total duration = attackMs + t60 + TRAILING_SILENCE_S', () => {
    const { param } = createMockAudioParam();
    const now = 0;
    // MIDI 60 → midrange: t60=11, attackMs=0.0015
    const duration = scheduleDecayEnvelope(param, now, 60);
    expect(duration).toBeCloseTo(0.0015 + 11 + TRAILING_SILENCE_S, 10);
  });

  it('returns correct duration for high treble (short decay)', () => {
    const { param } = createMockAudioParam();
    const duration = scheduleDecayEnvelope(param, 0, 108);
    // MIDI 108 → t60=1.5, attackMs=0.0005
    expect(duration).toBeCloseTo(0.0005 + 1.5 + TRAILING_SILENCE_S, 10);
  });

  it('schedules 5 automation events (set, ramp, expRamp, expRamp, ramp)', () => {
    const { param, calls } = createMockAudioParam();
    scheduleDecayEnvelope(param, 0, 60);
    // setValueAtTime(0) → linearRamp(1) → exponentialRamp(promptLevel) → exponentialRamp(aftersoundFloor) → linearRamp(0)
    expect(calls.length).toBe(5);
    expect(calls[0].method).toBe('setValueAtTime');
    expect(calls[1].method).toBe('linearRampToValueAtTime');
    expect(calls[2].method).toBe('exponentialRampToValueAtTime');
    expect(calls[3].method).toBe('exponentialRampToValueAtTime');
    expect(calls[4].method).toBe('linearRampToValueAtTime');
  });

  it('starts at 0 and peaks at 1.0', () => {
    const { param, calls } = createMockAudioParam();
    scheduleDecayEnvelope(param, 0, 60);
    expect(calls[0].args[0]).toBe(0);     // setValueAtTime(0, now)
    expect(calls[1].args[0]).toBeCloseTo(1.0);  // linearRamp → 1.0
  });

  it('final ramp targets 0', () => {
    const { param, calls } = createMockAudioParam();
    scheduleDecayEnvelope(param, 0, 60);
    expect(calls[4].args[0]).toBe(0);  // linearRamp → 0
  });

  it('uses AUDIO_CONFIG prompt/aftersound levels', () => {
    const { param, calls } = createMockAudioParam();
    scheduleDecayEnvelope(param, 0, 60);
    // Prompt level ramp
    expect(calls[2].args[0]).toBeCloseTo(AUDIO_CONFIG.PROMPT_LEVEL);
    // Aftersound floor ramp
    expect(calls[3].args[0]).toBeCloseTo(AUDIO_CONFIG.AFTERSOUND_FLOOR);
  });

  it('timestamps are monotonically increasing', () => {
    const { param, calls } = createMockAudioParam();
    scheduleDecayEnvelope(param, 0, 60);
    for (let i = 1; i < calls.length; i++) {
      expect(calls[i].args[1]).toBeGreaterThan(calls[i - 1].args[1]);
    }
  });
});

// ---------------------------------------------------------------------------
// TRAILING_SILENCE_S constant
// ---------------------------------------------------------------------------

describe('TRAILING_SILENCE_S', () => {
  it('is a positive number in seconds', () => {
    expect(TRAILING_SILENCE_S).toBeGreaterThan(0);
    expect(TRAILING_SILENCE_S).toBeLessThan(1);
  });
});
