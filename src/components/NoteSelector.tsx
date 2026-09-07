import { usePianoStore } from '@/store/pianoStore';
import { midiToFreq, midiToNoteName, keyIndexOf } from '@/model/pianoNotes';
import { centsToFreqRatio } from '@/audio/partialFreq';

export default function NoteSelector() {
  const selectedKeyId = usePianoStore((s) => s.selectedKeyId);
  const keys = usePianoStore((s) => s.keys);
  const numPartials = usePianoStore((s) => s.numPartials);
  const setNumPartials = usePianoStore((s) => s.setNumPartials);
  const activeTones = usePianoStore((s) => s.activeTones);
  const referenceFreq = usePianoStore((s) => s.referenceFreq);

  const selectedKey = selectedKeyId !== null
    ? keys[keyIndexOf(selectedKeyId)]
    : null;

  const noteName = selectedKey ? midiToNoteName(selectedKey.midiNote) : '--';
  const frequency = selectedKey
    ? (midiToFreq(selectedKey.midiNote, referenceFreq) * centsToFreqRatio(selectedKey.centsOffset)).toFixed(2)
    : '--';
  const bValue = selectedKey ? selectedKey.B.toFixed(6) : '--';
  const isToneActive = selectedKeyId !== null && activeTones.has(selectedKeyId);

  return (
    <div className="note-selector-card" data-testid="status-area">
      {/* Note + freq */}
      <div className="note-selector-pitch">
        <span className="note-selector-name">{noteName}</span>
        <span className="note-selector-freq">{frequency} Hz</span>
      </div>

      {/* B value / PTA */}
      <div className={`note-selector-b${isToneActive ? ' active' : ''}`}>
        {isToneActive ? 'PTA' : 'B'}: {bValue}
      </div>

      {/* Partials */}
      <label className="note-selector-partials">
        <div className="note-selector-partials-header">
          <span>Partials</span>
          <span className="note-selector-partials-count">{numPartials}</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={numPartials}
          onChange={(e) => setNumPartials(Number(e.target.value))}
          className="note-selector-partials-slider"
          aria-label="Number of partials"
        />
      </label>
    </div>
  );
}
