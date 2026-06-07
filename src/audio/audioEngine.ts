import { AUDIO_CONFIG, ToneConfig } from '@/types';
import { partialFreq, centsToFreqRatio } from '@/audio/partialFreq';
import { partialAmplitude } from '@/audio/envelope';

interface ActiveTone {
  oscillators: OscillatorNode[];
  partialGains: GainNode[];
  envelopeGain: GainNode;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private tones: Map<number, ActiveTone> = new Map();

  async init(): Promise<void> {
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

  playTone(midiNote: number, config: ToneConfig): void {
    if (!this.ctx || !this.masterGain) {
      return;
    }

    if (this.tones.has(midiNote)) {
      this.stopTone(midiNote);
    }

    const now = this.ctx.currentTime;
    const envelopeGain = this.ctx.createGain();
    envelopeGain.gain.setValueAtTime(0, now);
    envelopeGain.gain.linearRampToValueAtTime(1, now + AUDIO_CONFIG.ATTACK_MS);
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

    this.tones.set(midiNote, { oscillators, partialGains, envelopeGain });
  }

  stopTone(midiNote: number): void {
    if (!this.ctx) {
      return;
    }

    const tone = this.tones.get(midiNote);
    if (!tone) {
      return;
    }

    const now = this.ctx.currentTime;
    const releaseEnd = now + AUDIO_CONFIG.RELEASE_MS;

    tone.envelopeGain.gain.cancelScheduledValues(now);
    tone.envelopeGain.gain.setValueAtTime(tone.envelopeGain.gain.value, now);
    tone.envelopeGain.gain.linearRampToValueAtTime(0, releaseEnd);

    const { oscillators, partialGains, envelopeGain } = tone;

    const cleanupMs = AUDIO_CONFIG.RELEASE_MS * 1000;
    setTimeout(() => {
      for (const osc of oscillators) {
        try {
          osc.stop();
        } catch {
          // Already stopped — ignore
        }
        osc.disconnect();
      }
      for (const pg of partialGains) {
        pg.disconnect();
      }
      envelopeGain.disconnect();
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
    this.stopAll();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.masterGain = null;
    this.tones.clear();
  }
}
