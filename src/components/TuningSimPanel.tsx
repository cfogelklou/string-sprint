import { usePianoStore } from '@/store/pianoStore';
import { usePTAStore } from '@/store/ptaStore';
import TuningSimGameBar from '@/components/TuningSimGameBar';

const infoButtonStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid var(--color-text-dim)',
  background: 'transparent',
  color: 'var(--color-text-dim)',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'inherit',
};

export default function TuningSimPanel() {
  const tuningSimPhase = usePianoStore((s) => s.tuningSimPhase);
  const startTuningSim = usePianoStore((s) => s.startTuningSim);
  const openHelp = usePianoStore((s) => s.openHelp);
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
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => startTuningSim()}
          style={{
            flex: 1,
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>🎮</span>
          Tuning Practice
        </button>
        <button
          onClick={() => openHelp('tuning-practice')}
          aria-label="What is Tuning Practice?"
          title="What is Tuning Practice?"
          style={infoButtonStyle}
        >
          ?
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
        <button
          onClick={startPTAMode}
          style={{
            flex: 1,
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>🔬</span>
          Calibration Test
        </button>
        <button
          onClick={() => openHelp('calibration-test')}
          aria-label="What is the Calibration Test?"
          title="What is the Calibration Test?"
          style={infoButtonStyle}
        >
          ?
        </button>
      </div>
    </div>
  );
}
