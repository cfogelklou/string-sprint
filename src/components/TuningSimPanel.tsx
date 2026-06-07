import { useState } from 'react';
import { usePianoStore } from '@/store/pianoStore';
import { StretchStrategy } from '@/types';
import TuningSimGameBar from '@/components/TuningSimGameBar';

const STRETCH_OPTIONS: { label: string; value: StretchStrategy }[] = [
  { label: 'Equal Temperament', value: { kind: 'equal' } },
  { label: 'Railsback Stretch', value: { kind: 'railsback' } },
  { label: 'Partial 2 Align', value: { kind: 'partial_align', partial: 2 } },
  { label: 'Partial 3 Align', value: { kind: 'partial_align', partial: 3 } },
  { label: 'Partial 4 Align', value: { kind: 'partial_align', partial: 4 } },
];

export default function TuningSimPanel() {
  const tuningSimPhase = usePianoStore((s) => s.tuningSimPhase);
  const startTuningSim = usePianoStore((s) => s.startTuningSim);
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (tuningSimPhase !== 'idle') {
    return <TuningSimGameBar />;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      background: 'var(--color-surface)',
      borderRadius: 8,
      flexWrap: 'wrap',
    }}>
      <select
        value={selectedIdx}
        onChange={(e) => setSelectedIdx(Number(e.target.value))}
        style={{
          background: 'rgba(0,0,0,0.3)',
          color: 'var(--color-text)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 6,
          padding: '5px 8px',
          fontSize: 12,
          fontFamily: 'inherit',
        }}
      >
        {STRETCH_OPTIONS.map((opt, i) => (
          <option key={i} value={i}>{opt.label}</option>
        ))}
      </select>
      <button
        onClick={() => startTuningSim(STRETCH_OPTIONS[selectedIdx].value)}
        style={{
          background: 'var(--color-primary)',
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
        Tuning Sim
      </button>
    </div>
  );
}
