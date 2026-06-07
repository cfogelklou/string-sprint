import { usePianoStore } from '@/store/pianoStore';
import { NUM_KEYS } from '@/types';

export function useTuningSimulation() {
  const tuningSimPhase = usePianoStore((s) => s.tuningSimPhase);
  const tuningSimCompleted = usePianoStore((s) => s.tuningSimCompleted);
  const tuningSimResults = usePianoStore((s) => s.tuningSimResults);
  const tuningSimStretch = usePianoStore((s) => s.tuningSimStretch);
  const tuningSimTargetMidi = usePianoStore((s) => s.tuningSimTargetMidi);
  const tuningSimUserCommits = usePianoStore((s) => s.tuningSimUserCommits);

  return {
    phase: tuningSimPhase,
    isActive: tuningSimPhase !== 'idle',
    isPlaying: tuningSimPhase === 'playing',
    isRevealed: tuningSimPhase === 'revealed',
    stretch: tuningSimStretch,
    committedCount: tuningSimCompleted.size,
    totalKeys: NUM_KEYS,
    results: tuningSimResults,
    targetMidi: tuningSimTargetMidi,
    userCommits: tuningSimUserCommits,
  };
}
