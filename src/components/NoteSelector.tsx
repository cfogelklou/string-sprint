import { usePianoStore } from '@/store/pianoStore';
import { MIDI_A0 } from '@/types';
import { midiToFreq, midiToNoteName } from '@/model/pianoNotes';

export default function NoteSelector() {
  const selectedKeyId = usePianoStore((s) => s.selectedKeyId);
  const keys = usePianoStore((s) => s.keys);
  const numPartials = usePianoStore((s) => s.numPartials);
  const setNumPartials = usePianoStore((s) => s.setNumPartials);
  const activeTones = usePianoStore((s) => s.activeTones);

  const selectedKey = selectedKeyId !== null
    ? keys[selectedKeyId - MIDI_A0]
    : null;

  const noteName = selectedKey ? midiToNoteName(selectedKey.midiNote) : '--';
  const frequency = selectedKey
    ? midiToFreq(selectedKey.midiNote).toFixed(2)
    : '--';
  const bValue = selectedKey ? selectedKey.B.toFixed(6) : '--';
  const isToneActive = selectedKeyId !== null && activeTones.has(selectedKeyId);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 12px',
        background: 'var(--color-surface, #1e1e2e)',
        color: 'var(--color-text, #e0e0e0)',
      }}
    >
      {/* Note + freq */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 24, fontWeight: 700 }}>{noteName}</span>
        <span style={{ fontSize: 13, opacity: 0.6 }}>{frequency} Hz</span>
      </div>

      {/* B value / PTA */}
      <div style={{
        fontSize: 11,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        background: isToneActive ? 'rgba(0, 230, 118, 0.15)' : 'transparent',
        color: isToneActive ? 'var(--color-accent)' : 'var(--color-text-dim)',
        fontWeight: isToneActive ? 700 : 400,
        border: isToneActive ? '1px solid rgba(0, 230, 118, 0.3)' : '1px solid transparent',
        whiteSpace: 'nowrap',
      }}>
        {isToneActive ? 'PTA' : 'B'}: {bValue}
      </div>

      {/* Partials */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, whiteSpace: 'nowrap' }}>
        <span style={{ opacity: 0.6 }}>Partials</span>
        <span style={{ fontWeight: 600 }}>{numPartials}</span>
        <input
          type="range"
          min={1}
          max={10}
          value={numPartials}
          onChange={(e) => setNumPartials(Number(e.target.value))}
          style={{ width: 60 }}
        />
      </label>
    </div>
  );
}
