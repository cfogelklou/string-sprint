import { NUM_KEYS } from '@/types';
import { isBlackKey, midiAtIndex } from '@/model/pianoNotes';

/** White/black key widths in px (matches VirtualKeyboard rendering). */
export const WHITE_KEY_WIDTH = 44;
export const BLACK_KEY_WIDTH = 28;

export interface KeyLayoutEntry {
  midi: number;
  x: number;
}

/** Pure key-position layout over the full MIDI_LOWEST..C8 range. */
export function computeKeyLayout(): {
  whites: KeyLayoutEntry[];
  blacks: KeyLayoutEntry[];
} {
  const whites: KeyLayoutEntry[] = [];
  const blacks: KeyLayoutEntry[] = [];
  let whiteCount = 0;
  for (let i = 0; i < NUM_KEYS; i++) {
    const midi = midiAtIndex(i);
    if (isBlackKey(midi)) {
      blacks.push({ midi, x: whiteCount * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2 });
    } else {
      whites.push({ midi, x: whiteCount * WHITE_KEY_WIDTH });
      whiteCount++;
    }
  }
  return { whites, blacks };
}
