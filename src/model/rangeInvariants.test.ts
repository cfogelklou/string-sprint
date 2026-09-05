import { describe, it, expect } from 'vitest';
import { MIDI_A0, MIDI_C8, MIDI_LOWEST, NUM_KEYS, REGISTER_ENVELOPE_TABLE } from '@/types';
import { generateKeys, keyIndexOf, midiAtIndex } from './pianoNotes';
import { PIANO_B_PROFILES } from '@/bCoefficients/profiles';
import { computeTargets } from '@/tuning/stretchTargets';
import { getRegisterEnvelope } from '@/audio/envelope';

/**
 * Cross-module range invariants — single guard for the MIDI 9-20 extension.
 * If any array-base conversion site drifts from MIDI_LOWEST, these fail.
 */
describe('range invariants (MIDI_LOWEST extension)', () => {
  it('derives NUM_KEYS from the range bounds', () => {
    expect(MIDI_LOWEST).toBe(9);
    expect(MIDI_C8).toBe(108);
    expect(NUM_KEYS).toBe(MIDI_C8 - MIDI_LOWEST + 1);
    expect(NUM_KEYS).toBe(100);
  });

  it('generated keys span exactly MIDI_LOWEST..MIDI_C8', () => {
    const keys = generateKeys(new Array(NUM_KEYS).fill(0.0001));
    expect(keys[0].midiNote).toBe(MIDI_LOWEST);
    expect(keys[keys.length - 1].midiNote).toBe(MIDI_C8);
    expect(keys).toHaveLength(NUM_KEYS);
  });

  it('every B profile array has NUM_KEYS entries', () => {
    for (const values of Object.values(PIANO_B_PROFILES)) {
      expect(values).toHaveLength(NUM_KEYS);
    }
  });

  it('railsback targets array has NUM_KEYS entries', () => {
    const targets = computeTargets({ kind: 'railsback' }, new Array(NUM_KEYS).fill(0.001));
    expect(targets).toHaveLength(NUM_KEYS);
  });

  it('A0 remains MIDI 21 at array index 12', () => {
    expect(keyIndexOf(MIDI_A0)).toBe(12);
    expect(midiAtIndex(12)).toBe(MIDI_A0);
  });

  it('envelope table covers every MIDI in the key range exactly once', () => {
    for (let midi = MIDI_LOWEST; midi <= MIDI_C8; midi++) {
      const matching = REGISTER_ENVELOPE_TABLE.filter(
        (e) => midi >= e.midiLo && midi <= e.midiHi,
      );
      expect(matching).toHaveLength(1);
      expect(getRegisterEnvelope(midi).t60).toBe(matching[0].t60);
    }
  });
});
