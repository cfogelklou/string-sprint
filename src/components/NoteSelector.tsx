import { usePianoStore } from '@/store/pianoStore';
import { MIDI_A0 } from '@/types';
import { midiToFreq, midiToNoteName } from '@/model/pianoNotes';

export default function NoteSelector() {
  const selectedKeyId = usePianoStore((s) => s.selectedKeyId);
  const keys = usePianoStore((s) => s.keys);
  const numPartials = usePianoStore((s) => s.numPartials);
  const masterVolume = usePianoStore((s) => s.masterVolume);
  const setNumPartials = usePianoStore((s) => s.setNumPartials);
  const setMasterVolume = usePianoStore((s) => s.setMasterVolume);
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
        flexDirection: 'column',
        gap: 10,
        padding: 12,
        background: 'var(--color-surface, #1e1e2e)',
        borderRadius: 8,
        color: 'var(--color-text, #e0e0e0)',
      }}
    >
      {/* Note display */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 28, fontWeight: 700 }}>{noteName}</span>
        <span style={{ fontSize: 14, opacity: 0.7 }}>{frequency} Hz</span>
      </div>

      {/* B value / PTA indicator */}
      <div style={{
        fontSize: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        background: isToneActive ? 'rgba(0, 230, 118, 0.15)' : 'transparent',
        color: isToneActive ? 'var(--color-accent)' : 'var(--color-text-dim)',
        fontWeight: isToneActive ? 700 : 400,
        border: isToneActive ? '1px solid rgba(0, 230, 118, 0.3)' : '1px solid transparent',
      }}>
        {isToneActive ? 'PTA' : 'B'}: {bValue}
      </div>

      {/* Partials */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        <span style={{ display: 'flex', justifyContent: 'space-between' }}>
          Partials
          <span style={{ fontWeight: 600 }}>{numPartials}</span>
        </span>
        <input
          type="range"
          min={1}
          max={10}
          value={numPartials}
          onChange={(e) => setNumPartials(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </label>

      {/* Volume */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        <span style={{ display: 'flex', justifyContent: 'space-between' }}>
          Volume
          <span style={{ fontWeight: 600 }}>{Math.round(masterVolume * 100)}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={(e) => setMasterVolume(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </label>
    </div>
  );
}
