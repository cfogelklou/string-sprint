// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { usePianoStore } from '@/store/pianoStore';
import { AudioEngine } from '@/audio/audioEngine';

class MockAudioParam {
  value = 1;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
}

class MockGainNode {
  gain = new MockAudioParam();
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockOscillatorNode {
  frequency = new MockAudioParam();
  type = 'sine';
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  createGain = vi.fn(() => new MockGainNode());
  createOscillator = vi.fn(() => new MockOscillatorNode());
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

describe('AudioEngine and Store synchronization seam', () => {
  let engine: AudioEngine;

  beforeEach(async () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    usePianoStore.getState().stopAll();
    usePianoStore.getState().setInfiniteSustain(false);
    usePianoStore.getState().initAudio();

    engine = new AudioEngine();
    await engine.init();
  });

  afterEach(() => {
    engine.dispose();
    vi.unstubAllGlobals();
  });

  it('starts tone in engine with infinite sustain when mode is enabled and stops when mode disabled', () => {
    usePianoStore.getState().setInfiniteSustain(true);
    usePianoStore.getState().playNote(69);

    const activeTones = usePianoStore.getState().activeTones;
    expect(activeTones.has(69)).toBe(true);

    const toneConfig = activeTones.get(69)!;
    engine.playTone(69, toneConfig, true);
    expect(engine.isToneActive(69)).toBe(true);

    // Disabling infinite sustain removes the tone from store
    usePianoStore.getState().setInfiniteSustain(false);
    expect(usePianoStore.getState().activeTones.has(69)).toBe(false);

    // Sync path stops any engine tone not in store
    for (const midi of engine.activeToneKeys()) {
      if (!usePianoStore.getState().activeTones.has(midi)) {
        engine.stopTone(midi);
      }
    }
    expect(engine.isToneActive(69)).toBe(false);
  });
});
