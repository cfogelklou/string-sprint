import { useState } from 'react';
import { usePTAStore } from '@/store/ptaStore';
import { B_INPUT_MIN, B_INPUT_MAX } from '@/types';

function errorColor(pct: number | null): string {
  if (pct === null) return 'var(--color-text-dim)';
  if (pct < 5) return '#00e676';
  if (pct < 10) return '#ffaa00';
  return '#ff4444';
}

export default function PTAMeasureStep() {
  const { ptaState, ptaCaptureSample, ptaPlaySampleNote, ptaStopSampleNote } = usePTAStore();
  const [editingMidi, setEditingMidi] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');

  const capturedCount = ptaState.samples.filter((s) => s.captured).length;

  const handleSubmit = (midi: number) => {
    const val = parseFloat(inputValue);
    if (!isNaN(val) && val >= B_INPUT_MIN && val <= B_INPUT_MAX) {
      ptaCaptureSample(midi, val);
      setEditingMidi(null);
      setInputValue('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>
          {capturedCount}/8 notes measured (min 3)
        </span>
        <div style={{
          height: 4,
          flex: 1,
          marginLeft: 12,
          borderRadius: 2,
          background: 'var(--color-bg)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${(capturedCount / 8) * 100}%`,
            background: 'var(--color-accent)',
            borderRadius: 2,
            transition: 'width 0.2s',
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ptaState.samples.map((sample) => (
          <div
            key={sample.midi}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--color-bg)',
              border: `1px solid ${sample.captured ? errorColor(sample.relativeErrorPct) : 'var(--color-text-dim)'}`,
            }}
          >
            {/* Note name + play button */}
            <button
              onMouseDown={() => ptaPlaySampleNote(sample.midi)}
              onMouseUp={() => ptaStopSampleNote(sample.midi)}
              onMouseLeave={() => ptaStopSampleNote(sample.midi)}
              onTouchStart={() => ptaPlaySampleNote(sample.midi)}
              onTouchEnd={() => ptaStopSampleNote(sample.midi)}
              style={{
                width: 56,
                padding: '4px 0',
                borderRadius: 6,
                border: '1px solid var(--color-text-dim)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center',
                flexShrink: 0,
              }}
            >
              ▶ {sample.noteName}
            </button>

            {/* B input or result */}
            {sample.captured ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--color-text-dim)' }}>
                    True: {sample.trueB.toFixed(6)}
                  </span>
                  <span style={{ color: 'var(--color-text)' }}>
                    Measured: {sample.measuredB!.toFixed(6)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: errorColor(sample.relativeErrorPct) }}>
                    Error: {sample.relativeErrorPct!.toFixed(1)}%
                  </span>
                  <button
                    onClick={() => {
                      setEditingMidi(sample.midi);
                      setInputValue(sample.measuredB!.toString());
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-dim)',
                      fontSize: 11,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    redo
                  </button>
                </div>
              </div>
            ) : editingMidi === sample.midi ? (
              <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit(sample.midi);
                    if (e.key === 'Escape') { setEditingMidi(null); setInputValue(''); }
                  }}
                  placeholder="Enter B from strobopro"
                  step={0.0001}
                  min={B_INPUT_MIN}
                  max={B_INPUT_MAX}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--color-accent)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontSize: 13,
                  }}
                />
                <button
                  onClick={() => handleSubmit(sample.midi)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 4,
                    border: 'none',
                    background: 'var(--color-accent)',
                    color: 'var(--color-bg)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✓
                </button>
                <button
                  onClick={() => { setEditingMidi(null); setInputValue(''); }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--color-text-dim)',
                    background: 'transparent',
                    color: 'var(--color-text)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingMidi(sample.midi);
                  setInputValue('');
                }}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px dashed var(--color-text-dim)',
                  background: 'transparent',
                  color: 'var(--color-text-dim)',
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                Tap to enter measured B…
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
