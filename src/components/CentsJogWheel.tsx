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
  const playNote = usePianoStore((s) => s.playNote);
  const stopNote = usePianoStore((s) => s.stopNote);

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

  const nudgeCents = useCallback(
    (delta: number) => {
      stopInertia();
      const next = clampCents(currentCents + delta);
      commitCents(next);
      // Re-trigger note so user hears the new pitch
      if (selectedKeyId !== null) {
        stopNote(selectedKeyId);
        // Small delay so the engine processes stop before play
        setTimeout(() => playNote(selectedKeyId), 20);
      }
    },
    [currentCents, commitCents, stopInertia, selectedKeyId, playNote, stopNote],
  );

  const displayValue = isDragging ? localCents : currentCents;
  const sign = displayValue >= 0 ? '+' : '';
  const isPlaying = tuningSimPhase === 'playing';

  // Keyboard shortcuts: q/a = ±1¢, w/s = ±0.1¢, e/d = ±0.01¢
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (selectedKeyId === null) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      switch (e.key.toLowerCase()) {
        case 'q': nudgeCents(1); break;
        case 'a': nudgeCents(-1); break;
        case 'w': nudgeCents(0.1); break;
        case 's': nudgeCents(-0.1); break;
        case 'e': nudgeCents(0.01); break;
        case 'd': nudgeCents(-0.01); break;
        case 'r': handleReset(); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedKeyId, nudgeCents, handleReset]);

  // Fine-adjust button row (shared between game and normal mode)
  const FINE_STEPS = [
    { label: '−5¢', delta: -5 },
    { label: '−1¢', delta: -1 },
    { label: '−0.1¢', delta: -0.1 },
    { label: '+0.1¢', delta: 0.1 },
    { label: '+1¢', delta: 1 },
    { label: '+5¢', delta: 5 },
  ] as const;

  const btnStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 4,
    color: 'var(--color-text)',
    fontSize: 11,
    padding: '3px 6px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
    flex: 1,
    textAlign: 'center' as const,
  };

  const fineAdjustRow = (
    <div style={{ display: 'flex', gap: 4, padding: '0 8px 6px' }}>
      {FINE_STEPS.map(({ label, delta }) => (
        <button key={label} onClick={() => nudgeCents(delta)} style={btnStyle}>
          {label}
        </button>
      ))}
    </div>
  );

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

  // Game mode: NO feedback — just drag/buttons and a neutral label
  if (isPlaying) {
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

        {/* Neutral display — no sharp/flat hint */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            minHeight: 80,
            zIndex: 1,
            padding: '8px 16px',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-dim)' }}>
            Tune this note
          </span>
          <span style={{ fontSize: 10, color: 'var(--color-text-dim)', opacity: 0.4 }}>
            ← swipe → or buttons below · use your ear!
          </span>
        </div>

        {/* Fine-adjust buttons */}
        {fineAdjustRow}
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
        Reset (R)
      </button>

      {/* Fine-adjust buttons */}
      {fineAdjustRow}
    </div>
  );
}
