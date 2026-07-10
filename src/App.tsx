import { useEffect } from 'react';
import { usePianoStore } from '@/store/pianoStore';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import VirtualKeyboard from '@/components/VirtualKeyboard';
import KeyboardMinimap from '@/components/KeyboardMinimap';
import BasslineControls from '@/components/BasslineControls';
import HelpSheet from '@/components/HelpSheet';
import NoteSelector from '@/components/NoteSelector';
import CentsJogWheel from '@/components/CentsJogWheel';
import ProfilePicker from '@/components/ProfilePicker';
import BCurveEditor from '@/components/BCurveEditor';
import PTAWizard from '@/components/PTAWizard';
import { usePTAStore } from '@/store/ptaStore';
import TuningSimPanel from '@/components/TuningSimPanel';
import TuningSimResultsPanel from '@/components/TuningSimResultsPanel';

export default function App() {
  const isAudioInitialized = usePianoStore((s) => s.isAudioInitialized);
  const ptaActive = usePTAStore((s) => s.ptaActive);
  const { getEngine, init } = useAudioEngine();

  const masterVolume = usePianoStore((s) => s.masterVolume);
  const activeTones = usePianoStore((s) => s.activeTones);
  const isBCurveEditorOpen = usePianoStore((s) => s.isBCurveEditorOpen);
  const tuningSimPhase = usePianoStore((s) => s.tuningSimPhase);
  const resetTuning = usePianoStore((s) => s.resetTuning);
  const toggleBCurveEditor = usePianoStore((s) => s.toggleBCurveEditor);
  const setMasterVolume = usePianoStore((s) => s.setMasterVolume);
  const openHelp = usePianoStore((s) => s.openHelp);

  const infiniteSustain = usePianoStore((s) => s.infiniteSustain);
  const setInfiniteSustain = usePianoStore((s) => s.setInfiniteSustain);

  const isPlaying = tuningSimPhase === 'playing';

  // One-shot listener: init AudioContext on first user gesture
  useEffect(() => {
    let removed = false;
    const removeListeners = () => {
      if (removed) return;
      removed = true;
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
      document.removeEventListener('touchstart', handler);
    };
    const handler = () => {
      init().then(removeListeners).catch(() => {
        // Init failed — keep listeners attached so user can retry
      });
    };
    document.addEventListener('click', handler);
    document.addEventListener('keydown', handler);
    document.addEventListener('touchstart', handler);
    return removeListeners;
  }, [init]);

  // Sync activeTones → AudioEngine
  useEffect(() => {
    if (!isAudioInitialized) return;
    const engine = getEngine();
    const sustain = usePianoStore.getState().infiniteSustain;

    // Play tones that are in store but not in engine
    for (const [midi, config] of activeTones) {
      if (!engine.isToneActive(midi)) {
        engine.playTone(midi, config, sustain);
      }
    }
    // Stop tones that are in engine but not in store
    for (const midi of engine.activeToneKeys()) {
      if (!activeTones.has(midi)) {
        engine.stopTone(midi);
      }
    }
  }, [activeTones, isAudioInitialized, getEngine]);

  // Sync master volume → AudioEngine
  useEffect(() => {
    if (!isAudioInitialized) return;
    getEngine().setMasterVolume(masterVolume);
  }, [masterVolume, isAudioInitialized, getEngine]);

  return (
    <div id="fakepiano-app">
      {/* Status area */}
      <section className="status-area" data-testid="status-area">
        <NoteSelector />
      </section>

      {/* Cents jog wheel area */}
      <section className="cents-area" data-testid="cents-area">
        <CentsJogWheel />
      </section>

      {/* Controls bar — title, profile, volume, action buttons */}
      <section className="controls-bar" data-testid="controls-bar">
        <span className="controls-bar-title">Fake Piano</span>
        <ProfilePicker />
        <label className="controls-bar-volume">
          <span style={{ fontSize: 11, opacity: 0.7 }}>
            Vol {Math.round(masterVolume * 100)}%
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(e) => setMasterVolume(Number(e.target.value))}
            style={{ width: 70 }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={infiniteSustain}
            onChange={(e) => setInfiniteSustain(e.target.checked)}
          />
          <span style={{ opacity: 0.8 }}>∞ Sustain</span>
        </label>
        <span style={{ flex: 1 }} />
        {!isPlaying && (
          <button
            onClick={resetTuning}
            className="controls-bar-btn"
          >
            Reset Tuning
          </button>
        )}
        <button
          onClick={toggleBCurveEditor}
          className={`controls-bar-btn${isBCurveEditorOpen ? ' active' : ''}`}
        >
          B Curve
        </button>
        <button
          onClick={() => openHelp()}
          className="controls-bar-btn"
          aria-label="Help"
          title="Help"
          style={{ minWidth: 28, padding: '5px 8px' }}
        >
          ?
        </button>
      </section>

      {/* Tuning sim area */}
      <section className="tuning-sim-area" data-testid="tuning-sim-area">
        <TuningSimPanel />
      </section>

      {/* Keyboard minimap */}
      <div className="minimap-area" data-testid="minimap-area">
        <KeyboardMinimap
          onJumpToNote={(midi) => usePianoStore.getState().selectKey(midi)}
        />
      </div>

      {/* Virtual keyboard */}
      <div className="keyboard-area" data-testid="keyboard-area">
        <VirtualKeyboard />
      </div>

      {/* Bassline buttons */}
      <BasslineControls />

      {/* B Curve editor overlay */}
      <BCurveEditor />

      {/* Help overlay */}
      <HelpSheet />

      {/* PTA wizard overlay */}
      {ptaActive && <PTAWizard />}

      {/* Results reveal overlay */}
      <TuningSimResultsPanel />
    </div>
  );
}
