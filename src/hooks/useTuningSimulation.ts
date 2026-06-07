import { useMemo } from 'react';
import { usePianoStore } from '@/store/pianoStore';

const TUNED_THRESHOLD = 0.5; // cents

export function useTuningSimulation() {
  const tuningSimMode = usePianoStore((s) => s.tuningSimMode);
  const keys = usePianoStore((s) => s.keys);
  const tuningSimCompleted = usePianoStore((s) => s.tuningSimCompleted);

  const tunedCount = useMemo(
    () => keys.filter((k) => Math.abs(k.centsOffset) < TUNED_THRESHOLD).length,
    [keys],
  );

  return {
    isActive: tuningSimMode,
    tunedCount,
    totalCount: keys.length,
    completedCount: tuningSimCompleted.size,
  };
}
