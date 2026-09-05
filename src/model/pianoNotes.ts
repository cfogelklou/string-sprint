import { MIDI_LOWEST, NUM_KEYS, DEFAULT_A4, PianoKey } from '@/types';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const BLACK_KEY_INDICES = new Set([1, 3, 6, 8, 10]); // Within each octave

export { NOTE_NAMES };

export function midiToFreq(midi: number, a4: number = DEFAULT_A4): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

export function midiToNoteName(midi: number): string {
  const octave = Math.floor((midi - 12) / 12);
  const noteIndex = midi % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export function isBlackKey(midi: number): boolean {
  return BLACK_KEY_INDICES.has(midi % 12);
}

/** Array index for a MIDI note (MIDI_LOWEST → 0). Single conversion seam. */
export function keyIndexOf(midi: number): number {
  return midi - MIDI_LOWEST;
}

/** MIDI note at an array index (0 → MIDI_LOWEST). Inverse of keyIndexOf. */
export function midiAtIndex(i: number): number {
  return MIDI_LOWEST + i;
}

export function generateKeys(bProfile: number[], a4: number = DEFAULT_A4): PianoKey[] {
  const keys: PianoKey[] = [];
  for (let i = 0; i < NUM_KEYS; i++) {
    const midi = midiAtIndex(i);
    keys.push({
      midiNote: midi,
      name: midiToNoteName(midi),
      isBlack: isBlackKey(midi),
      fundamentalFreq: midiToFreq(midi, a4),
      B: bProfile[i],
      centsOffset: 0,
    });
  }
  return keys;
}

export function freqToMidi(freq: number, a4: number = DEFAULT_A4): number {
  return Math.round(12 * Math.log2(freq / a4) + 69);
}

export function freqToCents(freq: number, reference: number): number {
  return 1200 * Math.log2(freq / reference);
}
