import { usePianoStore } from '@/store/pianoStore';
import { NUM_KEYS } from '@/types';

export default function TuningSimGameBar() {
  const selectedKeyId = usePianoStore((s) => s.selectedKeyId);
  const tuningSimCompleted = usePianoStore((s) => s.tuningSimCompleted);
  const tuningSimStretch = usePianoStore((s) => s.tuningSimStretch);
  const commitNote = usePianoStore((s) => s.commitNote);
  const revealResults = usePianoStore((s) => s.revealResults);
  const randomizeUncommitted = usePianoStore((s) => s.randomizeUncommitted);
  const stopTuningSim = usePianoStore((s) => s.stopTuningSim);

  const committedCount = tuningSimCompleted.size;
  const canCommit = selectedKeyId !== null && !tuningSimCompleted.has(selectedKeyId);

  const stretchLabel = tuningSimStretch.kind === 'equal'
    ? 'Equal Temperament'
    : tuningSimStretch.kind === 'railsback'
      ? 'Railsback Stretch'
      : `Partial ${tuningSimStretch.partial} Align`;

  // Shared button style
  const btnStyle = (bg: string) => ({
    background: bg,
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 12,
    fontWeight: 600 as const,
    padding: '5px 10px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
  });

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
      <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>{stretchLabel}</span>
      <span style={{ fontSize: 12, fontWeight: 600 }}>
        {committedCount}/{NUM_KEYS} committed
      </span>
      <button
        onClick={() => selectedKeyId && commitNote(selectedKeyId)}
        disabled={!canCommit}
        style={{
          ...btnStyle(canCommit ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)'),
          opacity: canCommit ? 1 : 0.4,
          cursor: canCommit ? 'pointer' : 'not-allowed',
        }}
      >
        Commit
      </button>
      <button
        onClick={revealResults}
        disabled={committedCount === 0}
        style={{
          ...btnStyle(committedCount > 0 ? 'var(--color-accent)' : 'rgba(255,255,255,0.04)'),
          opacity: committedCount > 0 ? 1 : 0.4,
          cursor: committedCount > 0 ? 'pointer' : 'not-allowed',
        }}
      >
        Reveal Results
      </button>
      <button onClick={randomizeUncommitted} style={btnStyle('rgba(255,255,255,0.08)')}>
        Randomize
      </button>
      <button onClick={stopTuningSim} style={btnStyle('var(--color-destructive)')}>
        Stop
      </button>
    </div>
  );
}
