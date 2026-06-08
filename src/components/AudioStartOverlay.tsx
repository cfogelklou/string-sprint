import { useAudioEngine } from '@/hooks/useAudioEngine';

export function AudioStartOverlay() {
  const { init } = useAudioEngine();

  return (
    <div className="audio-start-overlay">
      <div className="audio-start-content">
        <h1>🎹 Fake Piano</h1>
        <p>Inharmonic tone generator for testing strobe tuners (specifically, StroboPro).</p>
        <button
          className="audio-start-button"
          onClick={init}
          aria-label="Start audio engine"
        >
          START AUDIO
        </button>
      </div>
    </div>
  );
}
