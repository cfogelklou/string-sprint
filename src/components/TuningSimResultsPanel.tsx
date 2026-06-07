import { useRef, useEffect, useCallback } from 'react';
import { usePianoStore } from '@/store/pianoStore';


// ---------------------------------------------------------------------------
// Grade color mapping
// ---------------------------------------------------------------------------

function gradeColor(grade: string): string {
  if (grade === 'A+' || grade === 'A') return '#00e676';
  if (grade === 'B') return '#ffaa00';
  if (grade === 'C') return '#ff6600';
  return '#ff4444'; // D, F
}

// ---------------------------------------------------------------------------
// Bar color based on absolute error (cents)
// ---------------------------------------------------------------------------

function barColor(error: number): string {
  const abs = Math.abs(error);
  if (abs < 0.5) return '#00e676';
  if (abs < 2) return '#ffaa00';
  return '#ff4444';
}

// ---------------------------------------------------------------------------
// Draw results bar chart on canvas
// ---------------------------------------------------------------------------

function drawResultsChart(
  canvas: HTMLCanvasElement,
  notes: { midiNote: number; error: number }[],
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;

  ctx.clearRect(0, 0, w, h);

  if (notes.length === 0) return;

  const padding = { top: 12, right: 8, bottom: 20, left: 8 };
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  const barWidth = Math.max(2, (plotW / notes.length) - 1);
  const gap = plotW / notes.length;

  // Find max absolute error for Y scale
  const maxError = Math.max(5, ...notes.map((n) => Math.abs(n.error)));

  const toY = (error: number) =>
    padding.top + plotH / 2 - (error / maxError) * (plotH / 2);

  // Zero line
  const zeroY = toY(0);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, zeroY);
  ctx.lineTo(w - padding.right, zeroY);
  ctx.stroke();

  // Draw bars
  for (let i = 0; i < notes.length; i++) {
    const x = padding.left + i * gap + (gap - barWidth) / 2;
    const error = notes[i].error;
    const y = error >= 0 ? toY(error) : zeroY;
    const barH = Math.abs(toY(error) - zeroY);

    ctx.fillStyle = barColor(error);
    ctx.fillRect(x, y, barWidth, barH);
  }

  // X axis labels (sparse)
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  const labelEvery = Math.max(1, Math.floor(notes.length / 10));
  for (let i = 0; i < notes.length; i += labelEvery) {
    const x = padding.left + i * gap + gap / 2;
    const noteName = midiNoteToName(notes[i].midiNote);
    ctx.fillText(noteName, x, h - 4);
  }
}

function midiNoteToName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const note = names[midi % 12];
  return `${note}${octave}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TuningSimResultsPanel() {
  const tuningSimResults = usePianoStore((s) => s.tuningSimResults);
  const backToPlaying = usePianoStore((s) => s.backToPlaying);
  const startTuningSim = usePianoStore((s) => s.startTuningSim);
  const tuningSimStretch = usePianoStore((s) => s.tuningSimStretch);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Draw chart when results change
  useEffect(() => {
    if (!tuningSimResults || !canvasRef.current) return;
    const canvas = canvasRef.current;
    drawResultsChart(canvas, tuningSimResults.notes);

    const observer = new ResizeObserver(() =>
      drawResultsChart(canvas, tuningSimResults.notes),
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [tuningSimResults]);

  // Swipe down to dismiss
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const startY = e.touches[0].clientY;
      const sheet = sheetRef.current;
      if (!sheet) return;

      const onTouchMove = (ev: TouchEvent) => {
        const dy = ev.touches[0].clientY - startY;
        if (dy > 0) {
          sheet.style.transform = `translateY(${dy}px)`;
        }
      };
      const onTouchEnd = (ev: TouchEvent) => {
        const dy = ev.changedTouches[0].clientY - startY;
        sheet.style.transform = '';
        if (dy > 80) {
          backToPlaying();
        }
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };

      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    },
    [backToPlaying],
  );

  if (!tuningSimResults) return null;

  const { notes, meanAbsoluteError, standardDeviation, withinHalfCent, withinOneCent, withinTwoCents, grade } = tuningSimResults;
  const total = notes.length;
  const gColor = gradeColor(grade);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={backToPlaying}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 100,
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '70vh',
          background: 'var(--color-surface)',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Drag handle + close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.2)',
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Results</span>
          <button
            onClick={backToPlaying}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text)',
              fontSize: 20,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Grade */}
        <div style={{ textAlign: 'center', padding: '12px 16px 4px', flexShrink: 0 }}>
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: gColor,
              letterSpacing: 2,
            }}
          >
            {grade}
          </span>
        </div>

        {/* Canvas bar chart */}
        <div style={{ padding: '8px 16px', flexShrink: 0 }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: 160,
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 6,
              display: 'block',
            }}
          />
        </div>

        {/* Summary stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px 16px',
            padding: '8px 16px',
            flexShrink: 0,
          }}
        >
          <StatRow label="Mean Error" value={`${meanAbsoluteError.toFixed(2)}¢`} />
          <StatRow label="Std Dev" value={`${standardDeviation.toFixed(2)}¢`} />
          <StatRow label="Within 0.5¢" value={`${withinHalfCent}/${total}`} />
          <StatRow label="Within 1.0¢" value={`${withinOneCent}/${total}`} />
          <StatRow label="Within 2.0¢" value={`${withinTwoCents}/${total}`} />
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '8px 16px 16px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={backToPlaying}
            style={{
              flex: 1,
              background: 'var(--color-primary)',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              padding: '8px 0',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Back to Tuning
          </button>
          <button
            onClick={() => {
              startTuningSim(tuningSimStretch);
            }}
            style={{
              flex: 1,
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              padding: '8px 0',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            New Game
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Small inline stat row helper
// ---------------------------------------------------------------------------

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 12,
        color: 'var(--color-text-dim)',
      }}
    >
      <span>{label}:</span>
      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}
