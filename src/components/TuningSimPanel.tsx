import { usePianoStore } from '@/store/pianoStore';
import { NUM_KEYS } from '@/types';

export default function TuningSimPanel() {
  const tuningSimMode = usePianoStore((s) => s.tuningSimMode);
  const keys = usePianoStore((s) => s.keys);
  const enableTuningSim = usePianoStore((s) => s.enableTuningSim);
  const disableTuningSim = usePianoStore((s) => s.disableTuningSim);
  const resetTuning = usePianoStore((s) => s.resetTuning);

  const tunedCount = keys.filter((k) => Math.abs(k.centsOffset) < 0.5).length;
  const allTuned = tunedCount === NUM_KEYS;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        background: 'var(--color-surface)',
        borderRadius: 8,
        flexWrap: 'wrap',
      }}
    >
      {/* Enable/Disable */}
      <button
        onClick={tuningSimMode ? disableTuningSim : enableTuningSim}
        style={{
          background: tuningSimMode ? 'var(--color-destructive)' : 'var(--color-primary)',
          border: 'none',
          borderRadius: 6,
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          padding: '5px 12px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        {tuningSimMode ? 'Stop Sim' : 'Tuning Sim'}
      </button>

      {tuningSimMode && (
        <>
          {/* Randomize */}
          <button
            onClick={enableTuningSim}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              color: 'var(--color-text)',
              fontSize: 12,
              padding: '5px 10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            Randomize
          </button>

          {/* Reset */}
          <button
            onClick={resetTuning}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              color: 'var(--color-text)',
              fontSize: 12,
              padding: '5px 10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            Reset
          </button>

          {/* Progress */}
          <span
            style={{
              fontSize: 12,
              color: allTuned ? 'var(--color-accent)' : 'var(--color-text-dim)',
              fontWeight: allTuned ? 700 : 400,
              whiteSpace: 'nowrap',
            }}
          >
            {tunedCount}/{NUM_KEYS} tuned
          </span>
        </>
      )}
    </div>
  );
}
