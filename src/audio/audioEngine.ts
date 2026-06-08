import { AUDIO_CONFIG, ToneConfig } from '@/types';
import { partialFreq, centsToFreqRatio } from '@/audio/partialFreq';
import { partialAmplitude, scheduleDecayEnvelope, getRegisterEnvelope, TRAILING_SILENCE_S } from '@/audio/envelope';

interface ActiveTone {
  oscillators: OscillatorNode[];
  partialGains: GainNode[];
  envelopeGain: GainNode;
  cleanupTimeout: ReturnType<typeof setTimeout> | null;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private tones: Map<number, ActiveTone> = new Map();

  /** Called when a tone's natural decay completes and the note should be
   *  removed from the store. Wired externally to keep engine store-agnostic. */
  onToneExpired: ((midi: number) => void) | null = null;

  get isInitialized(): boolean {
    return this.ctx !== null;
  }

  async init(): Promise<void> {
    if (this.ctx) return;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = AUDIO_CONFIG.MAX_SIMULTANEOUS_TONES > 0
      ? 1 / AUDIO_CONFIG.MAX_SIMULTANEOUS_TONES
      : 1;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  playTone(midiNote: number, config: ToneConfig, infiniteSustain: boolean): void {
    if (!this.ctx || !this.masterGain) {
      return;
    }

    // Stop existing tone if already playing — clear its cleanup timeout first
    if (this.tones.has(midiNote)) {
      const existing = this.tones.get(midiNote)!;
      if (existing.cleanupTimeout !== null) {
        clearTimeout(existing.cleanupTimeout);
      }
      this.stopTone(midiNote);
    }

    const now = this.ctx.currentTime;
    const envelopeGain = this.ctx.createGain();

    if (infiniteSustain) {
      // Classic behavior: attack ramp, hold forever
      envelopeGain.gain.setValueAtTime(0, now);
      envelopeGain.gain.linearRampToValueAtTime(1, now + AUDIO_CONFIG.ATTACK_S);
    } else {
      // Realistic decay: attack → exponential decay → trailing silence
      scheduleDecayEnvelope(envelopeGain.gain, now, midiNote);
    }

    envelopeGain.connect(this.masterGain);

    const centsRatio = centsToFreqRatio(config.centsOffset);
    const oscillators: OscillatorNode[] = [];
    const partialGains: GainNode[] = [];

    const numPartials = Math.min(config.numPartials, AUDIO_CONFIG.MAX_PARTIALS);

    for (let n = 1; n <= numPartials; n++) {
      const freq = partialFreq(config.frequency, config.B, n) * centsRatio;
      const amp = partialAmplitude(n);

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const partialGain = this.ctx.createGain();
      partialGain.gain.value = amp;

      osc.connect(partialGain);
      partialGain.connect(envelopeGain);

      osc.start(now);
      oscillators.push(osc);
      partialGains.push(partialGain);
    }

    let cleanupTimeout: ReturnType<typeof setTimeout> | null = null;

    if (!infiniteSustain) {
      // Schedule cleanup after full envelope duration (attack + t60 + trailing ramp)
      const { t60, attackMs } = getRegisterEnvelope(midiNote);
      const totalMs = (attackMs + t60 + TRAILING_SILENCE_S) * 1000 + 10; // trailing ramp + margin
      const timeoutId = setTimeout(() => {
        // Disconnect oscillators (wrapped in try/catch for dispose safety)
        for (const osc of oscillators) {
          try { osc.stop(); } catch { /* already stopped */ }
          try { osc.disconnect(); } catch { /* already disconnected */ }
        }
        for (const pg of partialGains) {
          try { pg.disconnect(); } catch { /* already disconnected */ }
        }
        try { envelopeGain.disconnect(); } catch { /* already disconnected */ }

        // Remove from engine map (only if this timeout is still current)
        const current = this.tones.get(midiNote);
        if (current && current.cleanupTimeout === timeoutId) {
          this.tones.delete(midiNote);
        }

        // Sync store so the sync effect doesn't resurrect the note
        this.onToneExpired?.(midiNote);
      }, totalMs);
      cleanupTimeout = timeoutId;
    }

    this.tones.set(midiNote, { oscillators, partialGains, envelopeGain, cleanupTimeout });
  }

  stopTone(midiNote: number): void {
    if (!this.ctx) {
      return;
    }

    const tone = this.tones.get(midiNote);
    if (!tone) {
      return;
    }

    // Clear any pending decay cleanup timeout
    if (tone.cleanupTimeout !== null) {
      clearTimeout(tone.cleanupTimeout);
      tone.cleanupTimeout = null;
    }

    const now = this.ctx.currentTime;

    // Cancel future automation, then use setTargetAtTime to smoothly
    // ramp from current automated level to 0 — avoids reading .value
    // which is unreliable during automation
    tone.envelopeGain.gain.cancelScheduledValues(now);
    tone.envelopeGain.gain.setTargetAtTime(
      0,
      now,
      AUDIO_CONFIG.DAMPER_RELEASE_S / 4,
    );

    const { oscillators, partialGains, envelopeGain } = tone;

    const cleanupMs = AUDIO_CONFIG.DAMPER_RELEASE_S * 1000;
    setTimeout(() => {
      for (const osc of oscillators) {
        try { osc.stop(); } catch { /* already stopped */ }
        try { osc.disconnect(); } catch { /* already disconnected */ }
      }
      for (const pg of partialGains) {
        try { pg.disconnect(); } catch { /* already disconnected */ }
      }
      try { envelopeGain.disconnect(); } catch { /* already disconnected */ }
    }, cleanupMs + 10);

    this.tones.delete(midiNote);
  }

  stopAll(): void {
    const notes = Array.from(this.tones.keys());
    for (const midiNote of notes) {
      this.stopTone(midiNote);
    }
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }

  isToneActive(midiNote: number): boolean {
    return this.tones.has(midiNote);
  }

  activeToneKeys(): number[] {
    return Array.from(this.tones.keys());
  }

  dispose(): void {
    // Clear all pending cleanup timeouts before stopping
    for (const tone of this.tones.values()) {
      if (tone.cleanupTimeout !== null) {
        clearTimeout(tone.cleanupTimeout);
      }
    }
    this.stopAll();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.masterGain = null;
    this.tones.clear();
  }
}
