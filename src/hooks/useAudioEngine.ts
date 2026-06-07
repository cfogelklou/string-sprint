import { useCallback } from 'react';
import { AudioEngine } from '@/audio/audioEngine';
import { usePianoStore } from '@/store/pianoStore';

let engineInstance: AudioEngine | null = null;

function getEngine(): AudioEngine {
  if (!engineInstance) {
    engineInstance = new AudioEngine();
  }
  return engineInstance;
}

export function useAudioEngine() {
  const init = useCallback(async () => {
    const engine = getEngine();
    await engine.init();
    usePianoStore.getState().initAudio();
  }, []);

  return { getEngine, init };
}
