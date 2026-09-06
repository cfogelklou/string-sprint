import { describe, it, expect, beforeEach } from 'vitest';
import { MIDI_LOWEST, MIDI_A0, NUM_KEYS, PIANO_PROFILE_NAMES } from '@/types';
import { usePianoStore } from './pianoStore';
import { usePTAStore } from './ptaStore';
import { PIANO_B_PROFILES } from '@/bCoefficients/profiles';
import { keyIndexOf } from '@/model/pianoNotes';

describe('usePianoStore sub-A0 keys', () => {
  beforeEach(() => {
    usePianoStore.getState().stopTuningSim();
    usePianoStore.getState().resetTuning();
    usePianoStore.getState().stopAll();
    usePianoStore.getState().setUseCustomProfile(false);
    usePianoStore.getState().setProfile(PIANO_PROFILE_NAMES.UPRIGHT);
  });

  it('default state has NUM_KEYS keys starting at MIDI_LOWEST', () => {
    const { keys } = usePianoStore.getState();
    expect(keys).toHaveLength(NUM_KEYS);
    expect(keys[0].midiNote).toBe(MIDI_LOWEST);
    expect(keys[0].name).toBe('A-1');
  });

  it('plays a sub-A0 note (MIDI 9 → A-1, 13.75 Hz, plateau B)', () => {
    usePianoStore.getState().playNote(MIDI_LOWEST);
    const { activeTones } = usePianoStore.getState();
    expect(activeTones.size).toBe(1);
    const tone = activeTones.get(MIDI_LOWEST)!;
    expect(tone.frequency).toBeCloseTo(13.75, 2);
    // Plateau B = the profile's A0 value
    expect(tone.B).toBe(PIANO_B_PROFILES[PIANO_PROFILE_NAMES.UPRIGHT][keyIndexOf(MIDI_A0)]);
  });

  it('plays MIDI 20 (boundary just below A0)', () => {
    usePianoStore.getState().playNote(20);
    expect(usePianoStore.getState().activeTones.has(20)).toBe(true);
  });

  it('setCentsOffset addresses sub-A0 keys', () => {
    usePianoStore.getState().setCentsOffset(MIDI_LOWEST, 12.3);
    const { keys } = usePianoStore.getState();
    expect(keys[keyIndexOf(MIDI_LOWEST)].centsOffset).toBe(12.3);
  });

  it('commitNote commits sub-A0 keys in the tuning sim', () => {
    usePianoStore.getState().startTuningSim();
    usePianoStore.getState().commitNote(MIDI_LOWEST);
    const { tuningSimCompleted, tuningSimUserCommits } = usePianoStore.getState();
    expect(tuningSimCompleted.has(MIDI_LOWEST)).toBe(true);
    expect(tuningSimUserCommits.has(MIDI_LOWEST)).toBe(true);
  });
});

describe('usePTAStore sample truth values', () => {
  it('samples read the profile slot matching each MIDI note', () => {
    usePTAStore.getState().startPTAMode();
    const samples = usePTAStore.getState().ptaState.samples;
    const upright = PIANO_B_PROFILES[PIANO_PROFILE_NAMES.UPRIGHT];
    for (const s of samples) {
      expect(s.trueB).toBe(upright[keyIndexOf(s.midi)]);
    }
    // A1 (MIDI 33) must read the A1 slot, not a 12-off neighbor
    const a1 = samples.find((s) => s.midi === 33)!;
    expect(a1.trueB).toBe(upright[keyIndexOf(33)]);
    usePTAStore.getState().stopPTAMode();
  });
});

describe('usePianoStore infinite sustain semantics', () => {
  beforeEach(() => {
    usePianoStore.getState().stopAll();
    usePianoStore.getState().setInfiniteSustain(false);
  });

  it('removes notes started with infinite sustain when mode is disabled', () => {
    usePianoStore.getState().setInfiniteSustain(true);
    usePianoStore.getState().playNote(69);
    expect(usePianoStore.getState().activeTones.has(69)).toBe(true);

    usePianoStore.getState().setInfiniteSustain(false);
    expect(usePianoStore.getState().activeTones.has(69)).toBe(false);
    expect(usePianoStore.getState().infiniteSustain).toBe(false);
  });

  it('preserves actively decaying notes started with normal decay when toggling sustain mode', () => {
    usePianoStore.getState().setInfiniteSustain(false);
    usePianoStore.getState().playNote(69);
    expect(usePianoStore.getState().activeTones.has(69)).toBe(true);

    usePianoStore.getState().setInfiniteSustain(true);
    usePianoStore.getState().setInfiniteSustain(false);
    // Note started under normal decay should still be in activeTones decaying naturally
    expect(usePianoStore.getState().activeTones.has(69)).toBe(true);
  });

  it('preserves dedicated tones with manualPartials and explicit infiniteSustain when global mode is disabled', () => {
    usePianoStore.getState().playCustomTone(9999, {
      frequency: 110,
      B: 0,
      centsOffset: 0,
      numPartials: 6,
      sustainDuration: 2.0,
      infiniteSustain: true,
      manualPartials: [{ freq: 110, amp: 1 }],
    });

    expect(usePianoStore.getState().activeTones.has(9999)).toBe(true);

    usePianoStore.getState().setInfiniteSustain(false);
    expect(usePianoStore.getState().activeTones.has(9999)).toBe(true);
  });
});
