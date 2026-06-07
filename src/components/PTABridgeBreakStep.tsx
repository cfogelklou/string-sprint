import { usePTAStore } from '@/store/ptaStore';
import { MIDI_A0 } from '@/types';
import { midiToNoteName } from '@/model/pianoNotes';

export default function PTABridgeBreakStep() {
  const { ptaState, ptaSetBridgeBreak } = usePTAStore();
  const breakNoteName = midiToNoteName(ptaState.bridgeBreakNote);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Explanation */}
      <div style={{
        padding: 16,
        borderRadius: 8,
        background: 'rgba(0, 230, 118, 0.08)',
        border: '1px solid rgba(0, 230, 118, 0.2)',
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--color-accent)' }}>
          What is Bridge Break?
        </h3>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--color-text)' }}>
          On a real piano, the <strong>bass strings</strong> are thick and wrapped
          in copper wire. The <strong>treble strings</strong> are thin, plain steel
          wire. The point where they switch is called the <em>bridge break</em>.
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--color-text)' }}>
          You can see this visually when you look inside a piano &mdash; it is obvious.
          This matters for tuning because the two string types have different
          inharmonicity characteristics, so the tuner processes them separately.
        </p>
      </div>

      {/* Default value */}
      <div style={{
        padding: 16,
        borderRadius: 8,
        background: 'var(--color-bg)',
        border: '1px solid var(--color-text-dim)',
      }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Default for {ptaState.pianoType.replace(/([A-Z])/g, ' $1').trim()}
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-accent)' }}>
          {breakNoteName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 4 }}>
          MIDI note {ptaState.bridgeBreakNote} (key {ptaState.bridgeBreakNote - MIDI_A0 + 1} of 88)
        </div>

        {/* Adjustable slider */}
        <div style={{ marginTop: 12 }}>
          <input
            type="range"
            min={MIDI_A0 + 15}
            max={MIDI_A0 + 35}
            value={ptaState.bridgeBreakNote}
            onChange={(e) => ptaSetBridgeBreak(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-dim)' }}>
            <span>{midiToNoteName(MIDI_A0 + 15)}</span>
            <span>{midiToNoteName(MIDI_A0 + 35)}</span>
          </div>
        </div>
      </div>

      {/* Mini keyboard visualization */}
      <div style={{
        display: 'flex',
        gap: 1,
        height: 32,
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        {Array.from({ length: 88 }, (_, i) => {
          const midi = MIDI_A0 + i;
          const isBass = midi < ptaState.bridgeBreakNote;
          const isBreak = midi === ptaState.bridgeBreakNote;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                background: isBreak
                  ? 'var(--color-accent)'
                  : isBass
                    ? 'rgba(255, 152, 0, 0.4)'
                    : 'rgba(66, 165, 245, 0.4)',
                minWidth: 2,
              }}
              title={midiToNoteName(midi)}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-dim)' }}>
        <span>🟠 Wound bass strings</span>
        <span>🔵 Plain wire treble</span>
      </div>
    </div>
  );
}
