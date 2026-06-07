import { useRef, useEffect, useCallback } from 'react';
import { usePianoStore } from '@/store/pianoStore';
import { PROFILE_LABELS } from '@/bCoefficients/profiles';
import { PianoProfileName, PIANO_PROFILE_NAMES, MIDI_A0, MIDI_C8, RigaudParams } from '@/types';
import { generateProfile } from '@/bCoefficients/rigaud';
import { PIANO_B_PROFILES } from '@/bCoefficients/profiles';

const PROFILE_KEYS: PianoProfileName[] = Object.values(PIANO_PROFILE_NAMES);
const PADDING = { top: 20, right: 16, bottom: 30, left: 50 };

function drawChart(
  canvas: HTMLCanvasElement,
  bProfile: number[],
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
  const plotW = w - PADDING.left - PADDING.right;
  const plotH = h - PADDING.top - PADDING.bottom;

  ctx.clearRect(0, 0, w, h);

  // Y range (log scale)
  const minB = 0.00005;
  const maxB = 0.06;
  const logMin = Math.log10(minB);
  const logMax = Math.log10(maxB);

  const toX = (midi: number) => PADDING.left + ((midi - MIDI_A0) / (MIDI_C8 - MIDI_A0)) * plotW;
  const toY = (b: number) => {
    const logVal = Math.log10(Math.max(minB, Math.min(maxB, b)));
    return PADDING.top + plotH - ((logVal - logMin) / (logMax - logMin)) * plotH;
  };

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  // Y gridlines
  for (let exp = -4; exp <= -1; exp++) {
    const val = Math.pow(10, exp);
    const y = toY(val);
    ctx.beginPath();
    ctx.moveTo(PADDING.left, y);
    ctx.lineTo(w - PADDING.right, y);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`1e${exp}`, PADDING.left - 6, y + 3);
  }

  // X axis labels
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  for (let midi = 24; midi <= 108; midi += 12) {
    const x = toX(midi);
    ctx.fillText(`M${midi}`, x, h - 6);
  }

  // Draw curve
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < bProfile.length; i++) {
    const midi = MIDI_A0 + i;
    const x = toX(midi);
    const y = toY(bProfile[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

const PARAM_LABELS: { key: keyof RigaudParams; label: string; step: number }[] = [
  { key: 's_B', label: 's_B', step: 0.001 },
  { key: 'y_B', label: 'y_B', step: 0.01 },
  { key: 's_T', label: 's_T', step: 0.001 },
  { key: 'y_T', label: 'y_T', step: 0.01 },
];

export default function BCurveEditor() {
  const isOpen = usePianoStore((s) => s.isBCurveEditorOpen);
  const toggle = usePianoStore((s) => s.toggleBCurveEditor);
  const activeProfile = usePianoStore((s) => s.activeProfile);
  const useCustomProfile = usePianoStore((s) => s.useCustomProfile);
  const setUseCustomProfile = usePianoStore((s) => s.setUseCustomProfile);
  const customParams = usePianoStore((s) => s.customParams);
  const setCustomParam = usePianoStore((s) => s.setCustomParam);
  const setProfile = usePianoStore((s) => s.setProfile);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Compute current B profile
  const bProfile = useCustomProfile
    ? generateProfile(customParams)
    : PIANO_B_PROFILES[activeProfile];

  // Draw chart when data or visibility changes
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    drawChart(canvas, bProfile);

    const observer = new ResizeObserver(() => drawChart(canvas, bProfile));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [isOpen, bProfile]);

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
          toggle();
        }
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };

      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    },
    [toggle],
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={toggle}
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
          <span style={{ fontSize: 14, fontWeight: 600 }}>B Curve Editor</span>
          <button
            onClick={toggle}
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

        {/* Canvas chart */}
        <div style={{ padding: '8px 16px', flexShrink: 0 }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: 180,
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 6,
              display: 'block',
            }}
          />
        </div>

        {/* Profile toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 16px',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Profile:</span>
          {useCustomProfile ? (
            <span style={{ fontSize: 13, color: 'var(--color-accent)' }}>Custom</span>
          ) : (
            <span style={{ fontSize: 13 }}>{PROFILE_LABELS[activeProfile]}</span>
          )}
          <button
            onClick={() => {
              if (useCustomProfile) {
                setUseCustomProfile(false);
              } else {
                setUseCustomProfile(true);
              }
            }}
            style={{
              marginLeft: 'auto',
              background: useCustomProfile ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              color: 'var(--color-text)',
              fontSize: 12,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            {useCustomProfile ? 'Use Preset' : 'Custom'}
          </button>
        </div>

        {/* Preset selector (when not custom) */}
        {!useCustomProfile && (
          <div style={{ padding: '4px 16px', flexShrink: 0 }}>
            <select
              value={activeProfile}
              onChange={(e) => setProfile(e.target.value as PianoProfileName)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.3)',
                color: 'var(--color-text)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                padding: '6px 8px',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              {PROFILE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {PROFILE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Rigaud params (custom mode) */}
        {useCustomProfile && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              padding: '8px 16px 16px',
              flexShrink: 0,
            }}
          >
            {PARAM_LABELS.map(({ key, label, step }) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  fontSize: 12,
                  color: 'var(--color-text-dim)',
                }}
              >
                {label}
                <input
                  type="number"
                  value={customParams[key]}
                  step={step}
                  onChange={(e) => setCustomParam(key, parseFloat(e.target.value) || 0)}
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 4,
                    color: 'var(--color-text)',
                    padding: '4px 6px',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    width: '100%',
                  }}
                />
              </label>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
