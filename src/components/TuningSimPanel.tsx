import { usePianoStore } from '@/store/pianoStore';
import { usePTAStore } from '@/store/ptaStore';
import TuningSimGameBar from '@/components/TuningSimGameBar';

export default function TuningSimPanel() {
  const tuningSimPhase = usePianoStore((s) => s.tuningSimPhase);
  const startTuningSim = usePianoStore((s) => s.startTuningSim);
  const startPTAMode = usePTAStore((s) => s.startPTAMode);

  if (tuningSimPhase !== 'idle') {
    return <TuningSimGameBar />;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '8px 12px',
      background: 'var(--color-surface)',
    }}>
      <button
        onClick={() => startTuningSim()}
        style={{
          background: 'var(--color-primary)',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
          padding: '10px 16px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 18 }}>🎮</span>
        Equal Tuning Sim
      </button>

      {/* PTA Test button */}
      <button
        onClick={startPTAMode}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-accent)',
          borderRadius: 8,
          color: 'var(--color-accent)',
          fontSize: 13,
          fontWeight: 600,
          padding: '8px 16px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 16 }}>🔬</span>
        PTA Test
      </button>
    </div>
  );
}
