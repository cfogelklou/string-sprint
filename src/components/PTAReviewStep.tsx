import { useRef, useEffect } from 'react';
import { usePTAStore } from '@/store/ptaStore';
import { MIDI_A0, NUM_KEYS } from '@/types';
import { midiToNoteName } from '@/model/pianoNotes';
import { PROFILE_LABELS } from '@/bCoefficients/profiles';

function drawCurve(
  canvas: HTMLCanvasElement,
  values: number[],
  label: string,
) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 20, right: 8, bottom: 24, left: 44 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  // Clear
  ctx.fillStyle = '#121212';
  ctx.fillRect(0, 0, w, h);

  // Value range
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  // Zero line
  if (minVal < 0 && maxVal > 0) {
    const zeroY = pad.top + plotH * (1 - (0 - minVal) / range);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, zeroY);
    ctx.lineTo(pad.left + plotW, zeroY);
    ctx.stroke();
  }

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
  }

  // Curve
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < values.length; i++) {
    const x = pad.left + (i / (values.length - 1)) * plotW;
    const y = pad.top + plotH * (1 - (values[i] - minVal) / range);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Y-axis labels
  ctx.fillStyle = '#999';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (plotH * i) / 4;
    const val = maxVal - (range * i) / 4;
    ctx.fillText(val.toFixed(1), pad.left - 4, y + 3);
  }

  // X-axis labels
  ctx.textAlign = 'center';
  const xLabels = [0, 24, 48, 72, 87];
  for (const idx of xLabels) {
    const x = pad.left + (idx / (values.length - 1)) * plotW;
    ctx.fillText(midiToNoteName(MIDI_A0 + idx), x, h - 4);
  }

  // Title
  ctx.fillStyle = '#e0e0e0';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(label, pad.left, 14);
}

export default function PTAReviewStep() {
  const { ptaState, ptaGenerateCurve } = usePTAStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    ptaGenerateCurve();
  }, [ptaGenerateCurve]);

  useEffect(() => {
    if (canvasRef.current && ptaState.stretchCurve.length === NUM_KEYS) {
      drawCurve(
        canvasRef.current,
        ptaState.stretchCurve,
        `Stretch Curve (${ptaState.octaveStyle}) — cents`,
      );
    }
  }, [ptaState.stretchCurve, ptaState.octaveStyle]);

  const captured = ptaState.samples.filter((s) => s.captured);
  const hasCurve = ptaState.stretchCurve.length === NUM_KEYS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <div style={{
        padding: 12,
        borderRadius: 8,
        background: 'var(--color-bg)',
        border: '1px solid var(--color-text-dim)',
      }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Configuration
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 13 }}>
          <span style={{ color: 'var(--color-text-dim)' }}>Piano</span>
          <span>{PROFILE_LABELS[ptaState.pianoType]}</span>
          <span style={{ color: 'var(--color-text-dim)' }}>Octave style</span>
          <span>{ptaState.octaveStyle}</span>
          <span style={{ color: 'var(--color-text-dim)' }}>Bridge break</span>
          <span>{midiToNoteName(ptaState.bridgeBreakNote)}</span>
          <span style={{ color: 'var(--color-text-dim)' }}>Notes measured</span>
          <span>{captured.length}/8</span>
        </div>
      </div>

      {/* Stretch curve chart */}
      {hasCurve && (
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: 160,
            borderRadius: 8,
          }}
        />
      )}

      {!hasCurve && (
        <div style={{
          padding: 32,
          textAlign: 'center',
          color: 'var(--color-text-dim)',
          fontSize: 13,
        }}>
          Generating stretch curve…
        </div>
      )}

      {/* Stats */}
      {hasCurve && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{
            padding: 8,
            borderRadius: 6,
            background: 'var(--color-bg)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Bass stretch</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {ptaState.stretchCurve[0].toFixed(1)}¢
            </div>
          </div>
          <div style={{
            padding: 8,
            borderRadius: 6,
            background: 'var(--color-bg)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Treble stretch</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              +{ptaState.stretchCurve[NUM_KEYS - 1].toFixed(1)}¢
            </div>
          </div>
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }}>
        Compare this curve with what strobopro generated. They should match closely.
      </p>
    </div>
  );
}
