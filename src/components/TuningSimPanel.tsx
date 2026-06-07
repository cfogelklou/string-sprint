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
  const [expanded, setExpanded] = useState(false);

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
      {/* Prominent game start button */}
      <button
        onClick={() => expanded && startTuningSim(STRETCH_OPTIONS[selectedIdx].value)}
        style={{
          background: expanded ? 'var(--color-accent)' : 'var(--color-primary)',
          border: 'none',
          borderRadius: 8,
          color: expanded ? '#000' : '#fff',
          fontSize: 14,
          fontWeight: 700,
          padding: '10px 16px',
          cursor: expanded ? 'pointer' : 'default',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: expanded ? 1 : 0.85,
        }}
      >
        <span style={{ fontSize: 18 }}>🎮</span>
        {expanded ? 'Start Game' : 'Tuning Simulation'}
      </button>

      {/* Expandable options */}
      {expanded && (
        <select
          value={selectedIdx}
          onChange={(e) => setSelectedIdx(Number(e.target.value))}
          style={{
            background: 'rgba(0,0,0,0.3)',
            color: 'var(--color-text)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            padding: '6px 8px',
            fontSize: 13,
            fontFamily: 'inherit',
            width: '100%',
          }}
        >
          {STRETCH_OPTIONS.map((opt, i) => (
            <option key={i} value={i}>{opt.label}</option>
          ))}
        </select>
      )}

      {/* Toggle expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-dim)',
          fontSize: 11,
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'center',
          padding: 0,
        }}
      >
        {expanded ? '▲ Less options' : '▼ Choose tuning strategy'}
      </button>
    </div>
  );
}
