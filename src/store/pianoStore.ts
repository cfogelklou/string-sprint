import { create } from 'zustand';
import {
  PianoKey,
  ToneConfig,
  PianoProfileName,
  RigaudParams,
  TuningSimPhase,
  StretchStrategy,
  TuningSimResults,
  AUDIO_CONFIG,
  PIANO_PROFILE_NAMES,
  MIDI_A0,
  NUM_KEYS,
  TUNING_SIM_CENTS_RANGE,
} from '@/types';
import { PIANO_B_PROFILES } from '@/bCoefficients/profiles';
import type { HelpSectionId } from '@/components/helpContent';
import { generateProfile, DEFAULT_RIGAUD_PARAMS } from '@/bCoefficients/rigaud';
import { generate88Keys, midiToFreq } from '@/model/pianoNotes';
import { computeTargets, computeResults } from '@/tuning/stretchTargets';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface PianoState {
  // Audio
  isAudioInitialized: boolean;
  masterVolume: number;
  sustainDuration: number;
  numPartials: number;

  // Reference frequency
  referenceFreq: number;

  // B coefficients
  activeProfile: PianoProfileName;
  customParams: RigaudParams;
  useCustomProfile: boolean;

  // Piano keys
  keys: PianoKey[];

  // Selection
  selectedKeyId: number | null;

  // Active tones
  activeTones: Map<number, ToneConfig>;

  // Envelope mode
  infiniteSustain: boolean;

  // Tuning simulation — game phase
  tuningSimPhase: TuningSimPhase;
  tuningSimStretch: StretchStrategy;
  tuningSimTargets: number[];
  tuningSimUserCommits: Map<number, number>;
  tuningSimResults: TuningSimResults | null;
  tuningSimTargetMidi: number | null;
  tuningSimCompleted: Set<number>;

  // UI state
  isBCurveEditorOpen: boolean;
  isHelpOpen: boolean;
  helpInitialSection: HelpSectionId | null;
}

const DEFAULT_STRETCH_STRATEGY: StretchStrategy = { kind: 'equal' };

const DEFAULT_PIANO_STATE: PianoState = {
  isAudioInitialized: false,
  masterVolume: 0.5,
  sustainDuration: 2.0,
  numPartials: AUDIO_CONFIG.MAX_PARTIALS,
  referenceFreq: 440,
  activeProfile: PIANO_PROFILE_NAMES.UPRIGHT,
  customParams: { ...DEFAULT_RIGAUD_PARAMS[PIANO_PROFILE_NAMES.UPRIGHT] },
  useCustomProfile: false,
  keys: generate88Keys(PIANO_B_PROFILES[PIANO_PROFILE_NAMES.UPRIGHT]),
  selectedKeyId: null,
  activeTones: new Map(),
  infiniteSustain: false,
  tuningSimPhase: 'idle',
  tuningSimStretch: DEFAULT_STRETCH_STRATEGY,
  tuningSimTargets: new Array(NUM_KEYS).fill(0),
  tuningSimUserCommits: new Map(),
  tuningSimResults: null,
  tuningSimTargetMidi: null,
  tuningSimCompleted: new Set(),
  isBCurveEditorOpen: false,
  isHelpOpen: false,
  helpInitialSection: null,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface PianoActions {
  initAudio: () => void;
  setProfile: (name: PianoProfileName) => void;
  selectKey: (midi: number | null) => void;
  playNote: (midi: number) => void;
  stopNote: (midi: number) => void;
  stopAll: () => void;
  setCentsOffset: (midi: number, cents: number) => void;
  setMasterVolume: (v: number) => void;
  setNumPartials: (n: number) => void;
  setInfiniteSustain: (value: boolean) => void;
  setCustomParam: (key: keyof RigaudParams, value: number) => void;
  setUseCustomProfile: (use: boolean) => void;
  toggleBCurveEditor: () => void;
  openHelp: (section?: HelpSectionId) => void;
  closeHelp: () => void;
  startTuningSim: () => void;
  stopTuningSim: () => void;
  commitNote: (midi: number) => void;
  revealResults: () => void;
  backToPlaying: () => void;
  randomizeUncommitted: () => void;
  setTuningSimTarget: (midi: number) => void;
  resetTuning: () => void;
  setReferenceFreq: (freq: number) => void;
}

type PianoStore = PianoState & PianoActions;

// ---------------------------------------------------------------------------
// Helper: regenerate keys preserving centsOffsets
// ---------------------------------------------------------------------------

function regenerateKeys(
  bProfile: number[],
  prevKeys: PianoKey[],
  a4: number = 440,
): PianoKey[] {
  const offsets = new Map<number, number>();
  for (const k of prevKeys) {
    offsets.set(k.midiNote, k.centsOffset);
  }
  const fresh = generate88Keys(bProfile, a4);
  return fresh.map((k) => ({
    ...k,
    centsOffset: offsets.get(k.midiNote) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Helper: current B profile (preset or custom)
// ---------------------------------------------------------------------------

function currentBProfile(state: PianoState): number[] {
  return state.useCustomProfile
    ? generateProfile(state.customParams)
    : PIANO_B_PROFILES[state.activeProfile];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePianoStore = create<PianoStore>()((set, get) => ({
  ...DEFAULT_PIANO_STATE,

  initAudio: () => {
    set({ isAudioInitialized: true });
  },

  setProfile: (name: PianoProfileName) => {
    const { keys, useCustomProfile } = get();
    if (useCustomProfile) {
      const bProfile = generateProfile(DEFAULT_RIGAUD_PARAMS[name]);
      set({
        activeProfile: name,
        customParams: { ...DEFAULT_RIGAUD_PARAMS[name] },
        keys: regenerateKeys(bProfile, keys, get().referenceFreq),
      });
    } else {
      const bProfile = PIANO_B_PROFILES[name];
      set({
        activeProfile: name,
        customParams: { ...DEFAULT_RIGAUD_PARAMS[name] },
        keys: regenerateKeys(bProfile, keys, get().referenceFreq),
      });
    }
  },

  selectKey: (midi: number | null) => {
    set({ selectedKeyId: midi });
  },

  playNote: (midi: number) => {
    const { keys, numPartials, sustainDuration, referenceFreq } = get();
    const keyIndex = midi - MIDI_A0;
    const key = keys[keyIndex];
    if (!key) return;

    const tone: ToneConfig = {
      frequency: midiToFreq(midi, referenceFreq),
      B: key.B,
      centsOffset: key.centsOffset,
      numPartials,
      sustainDuration,
    };

    // Monophonic: stop any existing tone, play only the new one
    set({ activeTones: new Map([[midi, tone]]) });
  },

  stopNote: (midi: number) => {
    const { activeTones } = get();
    if (!activeTones.has(midi)) return;
    const nextTones = new Map(activeTones);
    nextTones.delete(midi);
    set({ activeTones: nextTones });
  },

  stopAll: () => {
    set({ activeTones: new Map() });
  },

  setCentsOffset: (midi: number, cents: number) => {
    const { keys } = get();
    const keyIndex = midi - MIDI_A0;
    if (keyIndex < 0 || keyIndex >= NUM_KEYS) return;
    const nextKeys = [...keys];
    nextKeys[keyIndex] = { ...nextKeys[keyIndex], centsOffset: cents };
    set({ keys: nextKeys });
  },

  setMasterVolume: (v: number) => {
    set({ masterVolume: v });
  },

  setNumPartials: (n: number) => {
    set({ numPartials: n });
  },

  setInfiniteSustain: (value: boolean) => {
    set({ infiniteSustain: value });
  },

  setCustomParam: (paramKey: keyof RigaudParams, value: number) => {
    const { customParams, useCustomProfile, keys } = get();
    const nextParams = { ...customParams, [paramKey]: value };
    if (useCustomProfile) {
      const bProfile = generateProfile(nextParams);
      set({
        customParams: nextParams,
        keys: regenerateKeys(bProfile, keys, get().referenceFreq),
      });
    } else {
      set({ customParams: nextParams });
    }
  },

  setUseCustomProfile: (use: boolean) => {
    const { customParams, keys } = get();
    if (use) {
      const bProfile = generateProfile(customParams);
      set({
        useCustomProfile: true,
        keys: regenerateKeys(bProfile, keys, get().referenceFreq),
      });
    } else {
      const { activeProfile } = get();
      const bProfile = PIANO_B_PROFILES[activeProfile];
      set({
        useCustomProfile: false,
        keys: regenerateKeys(bProfile, keys, get().referenceFreq),
      });
    }
  },

  toggleBCurveEditor: () => {
    set((s) => ({ isBCurveEditorOpen: !s.isBCurveEditorOpen }));
  },

  openHelp: (section) => {
    set({ isHelpOpen: true, helpInitialSection: section ?? null });
  },

  closeHelp: () => {
    set({ isHelpOpen: false, helpInitialSection: null });
  },

  // ---------------------------------------------------------------------------
  // Tuning simulation game actions
  // ---------------------------------------------------------------------------

  startTuningSim: () => {
    const { keys } = get();
    const bProfile = currentBProfile(get());
    const stretch: StretchStrategy = { kind: 'equal' };
    const targets = computeTargets(stretch, bProfile);
    const nextKeys = keys.map((k) => ({
      ...k,
      centsOffset: (Math.random() * 2 - 1) * TUNING_SIM_CENTS_RANGE,
    }));
    set({
      tuningSimPhase: 'playing',
      tuningSimStretch: stretch,
      tuningSimTargets: targets,
      tuningSimUserCommits: new Map(),
      tuningSimResults: null,
      tuningSimCompleted: new Set(),
      tuningSimTargetMidi: null,
      keys: nextKeys,
    });
  },

  stopTuningSim: () => {
    const { keys } = get();
    const nextKeys = keys.map((k) => ({ ...k, centsOffset: 0 }));
    set({
      tuningSimPhase: 'idle',
      tuningSimTargets: new Array(NUM_KEYS).fill(0),
      tuningSimUserCommits: new Map(),
      tuningSimResults: null,
      tuningSimCompleted: new Set(),
      tuningSimTargetMidi: null,
      keys: nextKeys,
    });
  },

  commitNote: (midi: number) => {
    const { keys, tuningSimCompleted, tuningSimUserCommits } = get();
    const keyIndex = midi - MIDI_A0;
    if (keyIndex < 0 || keyIndex >= NUM_KEYS) return;

    const centsOffset = keys[keyIndex].centsOffset;
    const nextCommits = new Map(tuningSimUserCommits);
    nextCommits.set(midi, centsOffset);
    const nextCompleted = new Set(tuningSimCompleted);
    nextCompleted.add(midi);
    set({
      tuningSimUserCommits: nextCommits,
      tuningSimCompleted: nextCompleted,
    });
  },

  revealResults: () => {
    const { tuningSimUserCommits, tuningSimTargets } = get();
    const results = computeResults(tuningSimUserCommits, tuningSimTargets);
    set({
      tuningSimResults: results,
      tuningSimPhase: 'revealed',
    });
  },

  backToPlaying: () => {
    set({
      tuningSimPhase: 'playing',
      tuningSimResults: null,
    });
  },

  randomizeUncommitted: () => {
    const { keys, tuningSimCompleted } = get();
    const nextKeys = keys.map((k) => {
      if (tuningSimCompleted.has(k.midiNote)) return k;
      return {
        ...k,
        centsOffset: (Math.random() * 2 - 1) * TUNING_SIM_CENTS_RANGE,
      };
    });
    set({ keys: nextKeys });
  },

  setTuningSimTarget: (midi: number) => {
    set({ tuningSimTargetMidi: midi });
  },

  resetTuning: () => {
    const { keys } = get();
    const nextKeys = keys.map((k) => ({ ...k, centsOffset: 0 }));
    set({ keys: nextKeys });
  },

  setReferenceFreq: (freq: number) => {
    if (!Number.isFinite(freq) || freq <= 0) return;
    const { keys } = get();
    const bProfile = currentBProfile(get());
    set({
      referenceFreq: freq,
      keys: regenerateKeys(bProfile, keys, freq),
    });
  },
}));
