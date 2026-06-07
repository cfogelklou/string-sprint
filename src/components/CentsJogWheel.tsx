import { useRef, useState, useCallback, useEffect } from 'react';
import { usePianoStore } from '@/store/pianoStore';
import { MIDI_A0 } from '@/types';

const SENSITIVITY = 10; // px per cent
const FRICTION = 0.95;
const MIN_CENTS = -100;
const MAX_CENTS = 100;

function clampCents(v: number): number {
  return Math.round(Math.min(MAX_CENTS, Math.max(MIN_CENTS, v)) * 10) / 10;
}

export default function CentsJogWheel() {
  const selectedKeyId = usePianoStore((s) => s.selectedKeyId);
  const keys = usePianoStore((s) => s.keys);
  const setCentsOffset = usePianoStore((s) => s.setCentsOffset);
  const tuningSimPhase = usePianoStore((s) => s.tuningSimPhase);
  const tuningSimTargets = usePianoStore((s) => s.tuningSimTargets);

  const keyIndex = selectedKeyId !== null ? selectedKeyId - MIDI_A0 : -1;
  const currentCents = keyIndex >= 0 && keyIndex < keys.length ? keys[keyIndex].centsOffset : 0;

  const [localCents, setLocalCents] = useState(currentCents);
  const [isDragging, setIsDragging] = useState(false);

  const inertiaCentsRef = useRef(currentCents);

  const dragRef = useRef({
    startX: 0,
    startCents: 0,
    velocity: 0,
    lastX: 0,
    lastTime: 0,
    animFrame: 0,
  });

  // Sync local state when key changes externally
  useEffect(() => {
    if (!isDragging) {
      setLocalCents(currentCents);
    }
  }, [currentCents, isDragging]);

  const commitCents = useCallback(
    (v: number) => {
      const clamped = clampCents(v);
      inertiaCentsRef.current = clamped;
      setLocalCents(clamped);
      if (selectedKeyId !== null) {
        setCentsOffset(selectedKeyId, clamped);
      }
    },
    [selectedKeyId, setCentsOffset],
  );

  const stopInertia = useCallback(() => {
    if (dragRef.current.animFrame) {
      cancelAnimationFrame(dragRef.current.animFrame);
      dragRef.current.animFrame = 0;
    }
  }, []);

  const hapticBoundary = useCallback((prev: number, next: number) => {
    if (navigator.vibrate) {
      const prevWhole = Math.round(prev);
      const nextWhole = Math.round(next);
      if (prevWhole !== nextWhole) {
        navigator.vibrate(10);
      }
    }
  }, []);

  const runInertia = useCallback(() => {
    const d = dragRef.current;
    d.velocity *= FRICTION;
    if (Math.abs(d.velocity) < 0.05) {
      d.animFrame = 0;
      setIsDragging(false);
      return;
    }
    const prevCents = inertiaCentsRef.current;
    const next = clampCents(prevCents + d.velocity);
    inertiaCentsRef.current = next;
    commitCents(next);
    hapticBoundary(prevCents, next);
    d.animFrame = requestAnimationFrame(runInertia);
  }, [commitCents, hapticBoundary]);

  const handleDragStart = useCallback(
    (clientX: number) => {
      stopInertia();
      setIsDragging(true);
      const d = dragRef.current;
      d.startX = clientX;
      d.startCents = currentCents;
      d.velocity = 0;
      d.lastX = clientX;
      d.lastTime = performance.now();
    },
    [currentCents, stopInertia],
  );

  const handleDragMove = useCallback(
    (clientX: number) => {
      const d = dragRef.current;
      const dx = clientX - d.startX;
      const now = performance.now();
      const dt = now - d.lastTime;
      if (dt > 0) {
        d.velocity = ((clientX - d.lastX) / dt) * 16;
      }
      d.lastX = clientX;
      d.lastTime = now;

      const deltaCents = dx / SENSITIVITY;
      const prev = d.startCents;
      const next = clampCents(prev + deltaCents);
      commitCents(next);
      hapticBoundary(prev, next);
    },
    [commitCents, hapticBoundary],
  );

  const handleDragEnd = useCallback(() => {
    const d = dragRef.current;
    if (Math.abs(d.velocity) > 0.5) {
      d.animFrame = requestAnimationFrame(runInertia);
    } else {
      setIsDragging(false);
    }
  }, [runInertia]);

  useEffect(() => {
    return () => stopInertia();
  }, [stopInertia]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      handleDragStart(e.touches[0].clientX);
    },
    [handleDragStart],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      handleDragMove(e.touches[0].clientX);
    },
    [handleDragMove],
  );

  const onTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientX);
      const onMouseMove = (ev: MouseEvent) => handleDragMove(ev.clientX);
      const onMouseUp = () => {
        handleDragEnd();
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [handleDragStart, handleDragMove, handleDragEnd],
  );

  const handleReset = useCallback(() => {
    stopInertia();
    setIsDragging(false);
    commitCents(0);
  }, [commitCents, stopInertia]);

  const displayValue = isDragging ? localCents : currentCents;
  const sign = displayValue >= 0 ? '+' : '';
  const isPlaying = tuningSimPhase === 'playing';

  // Tick marks
  const ticks = [];
  for (let c = MIN_CENTS; c <= MAX_CENTS; c += 10) {
    const pct = ((c - MIN_CENTS) / (MAX_CENTS - MIN_CENTS)) * 100;
    const isMajor = c % 50 === 0;
    ticks.push(
      <div
        key={c}
        style={{
          position: 'absolute',
          left: `${pct}%`,
          top: isMajor ? '50%' : '60%',
          transform: 'translateX(-50%)',
          width: 1,
          height: isMajor ? 16 : 8,
          background: isMajor ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
        }}
      />,
    );
  }

  if (selectedKeyId === null) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 80,
          background: 'var(--color-surface)',
          borderRadius: 8,
          padding: 16,
          color: 'var(--color-text-dim)',
          fontSize: 14,
        }}
      >
        Tap a key to select it
      </div>
    );
  }

  // Game mode: show direction label + proximity bar, no exact cents
  if (isPlaying) {
    const target = keyIndex >= 0 ? tuningSimTargets[keyIndex] : 0;
    const distance = displayValue - target;
    const absDistance = Math.abs(distance);
    const fillRatio = Math.max(0, 1 - absDistance / 25);

    // Color: red → yellow → green
    const r = fillRatio < 0.5 ? 255 : Math.round(255 * (1 - (fillRatio - 0.5) * 2));
    const g = fillRatio < 0.5 ? Math.round(170 * fillRatio * 2) : Math.round(170 + (230 - 170) * (fillRatio - 0.5) * 2);
    const b = fillRatio >= 0.95 ? 118 : Math.round(68 * (1 - fillRatio));
    const barColor = `rgb(${r},${g},${b})`;

    const direction = distance > 0.5 ? '♯ Sharp' : distance < -0.5 ? '♭ Flat' : '✓ In Tune';

    return (
      <div
        style={{
          position: 'relative',
          minHeight: 96,
          background: 'var(--color-surface)',
          borderRadius: 8,
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
      >
        {/* Tick background */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {ticks}
        </div>

        {/* Tuning control display */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            minHeight: 96,
            zIndex: 1,
            padding: '8px 16px',
          }}
        >
          {/* Direction label */}
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: barColor,
              letterSpacing: 1,
            }}
          >
            {direction}
          </span>

          {/* Proximity bar */}
          <div
            style={{
              width: '85%',
              height: 16,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                width: `${fillRatio * 100}%`,
                height: '100%',
                borderRadius: 8,
                background: barColor,
                transition: 'width 0.1s ease-out, background 0.1s ease-out',
              }}
            />
          </div>

          {/* Drag hint */}
          <span style={{ fontSize: 10, color: 'var(--color-text-dim)', opacity: 0.4 }}>
            ← swipe to tune →
          </span>
        </div>
      </div>
    );
  }

  // Normal mode: exact cents display
  return (
    <div
      style={{
        position: 'relative',
        minHeight: 80,
        background: 'var(--color-surface)',
        borderRadius: 8,
        overflow: 'hidden',
        touchAction: 'none',
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
    >
      {/* Tick background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {ticks}
      </div>

      {/* Cents readout */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          minHeight: 80,
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontFeatureSettings: '"tnum"',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 28,
            fontWeight: 700,
            color: Math.abs(displayValue) < 0.1 ? 'var(--color-accent)' : 'var(--color-text)',
            letterSpacing: 1,
            minWidth: 160,
            textAlign: 'center',
          }}
        >
          {sign}
          {displayValue.toFixed(1)} cents
        </div>
      </div>

      {/* Reset button */}
      <button
        onClick={handleReset}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 6,
          color: 'var(--color-text)',
          fontSize: 12,
          padding: '4px 10px',
          cursor: 'pointer',
          zIndex: 2,
        }}
      >
        Reset
      </button>
    </div>
  );
}
