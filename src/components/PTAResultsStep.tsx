import { usePTAStore } from '@/store/ptaStore';

function gradeColor(grade: string): string {
  if (grade === 'A+' || grade === 'A') return '#00e676';
  if (grade === 'B') return '#ffaa00';
  if (grade === 'C') return '#ff6600';
  return '#ff4444';
}

export default function PTAResultsStep() {
  const { ptaState, stopPTAMode } = usePTAStore();
  const grade = ptaState.grade ?? '—';
  const captured = ptaState.samples.filter((s) => s.captured);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', padding: '8px 0' }}>
      {/* Grade */}
      <div style={{
        fontSize: 72,
        fontWeight: 700,
        color: gradeColor(grade),
        lineHeight: 1,
      }}>
        {grade}
      </div>
      <div style={{ fontSize: 14, color: 'var(--color-text-dim)' }}>
        Measurement Accuracy
      </div>

      {/* Stats */}
      <div style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
      }}>
        <div style={{
          padding: 12,
          borderRadius: 8,
          background: 'var(--color-bg)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>
            Mean Error
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
            {ptaState.meanErrorPct !== null ? `${ptaState.meanErrorPct.toFixed(1)}%` : '—'}
          </div>
        </div>
        <div style={{
          padding: 12,
          borderRadius: 8,
          background: 'var(--color-bg)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>
            Notes Measured
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
            {captured.length}/8
          </div>
        </div>
      </div>

      {/* Per-note breakdown */}
      {captured.length > 0 && (
        <div style={{ width: '100%' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Per-Note Breakdown
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 3fr 2fr',
            gap: '4px 8px',
            fontSize: 12,
            fontFamily: 'system-ui',
          }}>
            <span style={{ color: 'var(--color-text-dim)' }}>Note</span>
            <span style={{ color: 'var(--color-text-dim)' }}>Error</span>
            <span style={{ color: 'var(--color-text-dim)' }}>Status</span>
            {captured.map((s) => (
              <>
                <span key={`n${s.midi}`} style={{ fontWeight: 600 }}>{s.noteName}</span>
                <span key={`e${s.midi}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {s.relativeErrorPct!.toFixed(1)}%
                </span>
                <span key={`s${s.midi}`} style={{ color: s.relativeErrorPct! < 5 ? '#00e676' : s.relativeErrorPct! < 10 ? '#ffaa00' : '#ff4444' }}>
                  {s.relativeErrorPct! < 5 ? '✓' : s.relativeErrorPct! < 10 ? '≈' : '✗'}
                </span>
              </>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 8 }}>
        <button
          onClick={stopPTAMode}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 8,
            border: '1px solid var(--color-text-dim)',
            background: 'transparent',
            color: 'var(--color-text)',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Done
        </button>
        <button
          onClick={() => {
            const { startPTAMode } = usePTAStore.getState();
            stopPTAMode();
            startPTAMode();
          }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--color-primary)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          New Test
        </button>
      </div>
    </div>
  );
}
