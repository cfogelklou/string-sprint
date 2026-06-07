import { create } from 'zustand';
import {
  type PianoProfileName,
  type OctaveStyle,
  type PTAStep,
  type PTASampleMeasurement,
  MIDI_A0,
  PTA_BRIDGE_BREAK_DEFAULTS,
  PTA_SAMPLE_NOTES,
  B_INPUT_MIN,
  B_INPUT_MAX,
} from '@/types';
import { PIANO_B_PROFILES } from '@/bCoefficients/profiles';
import { usePianoStore } from './pianoStore';
import { calculateRailsbackOffset, gradeSampleMeasurements } from '@/pta/ptaCalculations';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface PTAWizardState {
  step: PTAStep;
  pianoType: PianoProfileName;
  octaveStyle: OctaveStyle;
  bridgeBreakNote: number;
  samples: PTASampleMeasurement[];
  stretchCurve: number[];
  grade: string | null;
  meanErrorPct: number | null;
}

interface PTAStoreState {
  ptaActive: boolean;
  ptaState: PTAWizardState;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const DEFAULT_PTA_TYPE: PianoProfileName = 'upright';

function createDefaultSamples(pianoType: PianoProfileName): PTASampleMeasurement[] {
  const profile = PIANO_B_PROFILES[pianoType];
  return PTA_SAMPLE_NOTES.map((note) => {
    const idx = note.midi - MIDI_A0;
    return {
      noteName: note.name,
      midi: note.midi,
      trueB: profile[idx],
      measuredB: null,
      error: null,
      relativeErrorPct: null,
      captured: false,
    };
  });
}

function defaultWizardState(): PTAWizardState {
  return {
    step: 'setup',
    pianoType: DEFAULT_PTA_TYPE,
    octaveStyle: '4:2',
    bridgeBreakNote: PTA_BRIDGE_BREAK_DEFAULTS[DEFAULT_PTA_TYPE],
    samples: createDefaultSamples(DEFAULT_PTA_TYPE),
    stretchCurve: [],
    grade: null,
    meanErrorPct: null,
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface PTAStoreActions {
  startPTAMode: () => void;
  stopPTAMode: () => void;
  ptaSetPianoType: (type: PianoProfileName) => void;
  ptaSetOctaveStyle: (style: OctaveStyle) => void;
  ptaSetBridgeBreak: (midiNote: number) => void;
  ptaCaptureSample: (midi: number, measuredB: number) => void;
  ptaGenerateCurve: () => void;
  ptaGoToStep: (step: PTAStep) => void;
  ptaPlaySampleNote: (midi: number) => void;
  ptaStopSampleNote: (midi: number) => void;
}

type PTAStore = PTAStoreState & PTAStoreActions;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePTAStore = create<PTAStore>()((set, get) => ({
  ptaActive: false,
  ptaState: defaultWizardState(),

  startPTAMode: () => {
    // Guard: stop tuning sim if active
    const pianoState = usePianoStore.getState();
    if (pianoState.tuningSimPhase !== 'idle') {
      pianoState.stopTuningSim();
    }
    // Force preset mode and sync profile to DEFAULT_PTA_TYPE
    pianoState.setUseCustomProfile(false);
    pianoState.setProfile(DEFAULT_PTA_TYPE);
    set({ ptaActive: true, ptaState: defaultWizardState() });
  },

  stopPTAMode: () => {
    usePianoStore.getState().stopAll();
    set({ ptaActive: false, ptaState: defaultWizardState() });
  },

  ptaSetPianoType: (type: PianoProfileName) => {
    const { ptaState } = get();
    const pianoStore = usePianoStore.getState();
    // Force preset mode so PTA uses PIANO_B_PROFILES (not custom Rigaud)
    pianoStore.setUseCustomProfile(false);
    pianoStore.setProfile(type);
    set({
      ptaState: {
        ...ptaState,
        pianoType: type,
        bridgeBreakNote: PTA_BRIDGE_BREAK_DEFAULTS[type],
        samples: createDefaultSamples(type),
        stretchCurve: [],
        grade: null,
        meanErrorPct: null,
      },
    });
  },

  ptaSetOctaveStyle: (style: OctaveStyle) => {
    const { ptaState } = get();
    set({
      ptaState: { ...ptaState, octaveStyle: style },
    });
  },

  ptaSetBridgeBreak: (midiNote: number) => {
    const { ptaState } = get();
    set({
      ptaState: { ...ptaState, bridgeBreakNote: midiNote },
    });
  },

  ptaCaptureSample: (midi: number, measuredB: number) => {
    const { ptaState } = get();
    if (measuredB < B_INPUT_MIN || measuredB > B_INPUT_MAX) return;

    const nextSamples = ptaState.samples.map((s) => {
      if (s.midi !== midi) return s;
      const error = Math.abs(measuredB - s.trueB);
      const relativeErrorPct = (error / s.trueB) * 100;
      return {
        ...s,
        measuredB,
        error,
        relativeErrorPct,
        captured: true,
      };
    });

    set({ ptaState: { ...ptaState, samples: nextSamples } });
  },

  ptaGenerateCurve: () => {
    const { ptaState } = get();
    const bValues = PIANO_B_PROFILES[ptaState.pianoType];
    const referenceFreq = usePianoStore.getState().referenceFreq;
    const stretchCurve = calculateRailsbackOffset(
      bValues,
      ptaState.octaveStyle,
      referenceFreq,
    );

    const { grade, meanRelativeErrorPct } = gradeSampleMeasurements(
      ptaState.samples,
    );

    set({
      ptaState: {
        ...ptaState,
        stretchCurve,
        grade,
        meanErrorPct: meanRelativeErrorPct,
      },
    });
  },

  ptaGoToStep: (step: PTAStep) => {
    const { ptaState } = get();
    set({ ptaState: { ...ptaState, step } });
  },

  ptaPlaySampleNote: (midi: number) => {
    usePianoStore.getState().playNote(midi);
  },

  ptaStopSampleNote: (midi: number) => {
    usePianoStore.getState().stopNote(midi);
  },
}));
