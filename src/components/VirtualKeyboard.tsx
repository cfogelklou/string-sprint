import { useRef, useEffect, useCallback, useState } from 'react';
import { usePianoStore } from '@/store/pianoStore';
import { midiToNoteName } from '@/model/pianoNotes';
import { computeKeyLayout, WHITE_KEY_WIDTH, BLACK_KEY_WIDTH } from '@/model/keyLayout';
import { MIDI_C8, MIDI_LOWEST } from '@/types';

const MIN_WHITE_HEIGHT = 100;
const MIN_BLACK_HEIGHT = 60;

// Hover-edge auto-pan (mouse only). See docs/hover-pan design in VirtualKeyboard.
const EDGE_ZONE = 28; // px from each edge that activates panning
const PAN_SPEED = 7; // px scrolled per animation frame
const DWELL_MS = 150; // hover dwell before panning starts (lets edge-key clicks win)

export default function VirtualKeyboard() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownRef = useRef(false);
  const lastClientXRef = useRef<number | null>(null);
  const [containerHeight, setContainerHeight] = useState(160);

  // Measure container and scale key heights
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const whiteKeyHeight = Math.max(MIN_WHITE_HEIGHT, containerHeight);
  const blackKeyHeight = Math.max(MIN_BLACK_HEIGHT, containerHeight * 0.6);

  const activeTones = usePianoStore((s) => s.activeTones);
  const selectedKeyId = usePianoStore((s) => s.selectedKeyId);
  const playNote = usePianoStore((s) => s.playNote);
  const stopNote = usePianoStore((s) => s.stopNote);
  const selectKey = usePianoStore((s) => s.selectKey);
  const tuningSimPhase = usePianoStore((s) => s.tuningSimPhase);
  const tuningSimCompleted = usePianoStore((s) => s.tuningSimCompleted);
  const tuningSimTargetMidi = usePianoStore((s) => s.tuningSimTargetMidi);
  const infiniteSustain = usePianoStore((s) => s.infiniteSustain);

  const isPlaying = tuningSimPhase === 'playing';

  // Build layout: positions for white keys and black keys
  const { whites: whiteKeyPositions, blacks: blackKeyPositions } = computeKeyLayout();

  const totalWidth = whiteKeyPositions.length * WHITE_KEY_WIDTH;

  // --- Hover-edge auto-pan (mouse only) ---
  const stopPan = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const clearDwell = useCallback(() => {
    if (dwellTimerRef.current !== null) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
  }, []);

  const panStep = useCallback(() => {
    const el = scrollRef.current;
    const clientX = lastClientXRef.current;
    if (!el || clientX === null) {
      rafRef.current = null;
      return;
    }
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const dir = x < EDGE_ZONE ? -1 : x > rect.width - EDGE_ZONE ? 1 : 0;

    if (dir !== 0 && !pointerDownRef.current) {
      const maxScroll = el.scrollWidth - el.clientWidth;
      const canScroll = dir < 0 ? el.scrollLeft > 0 : el.scrollLeft < maxScroll;
      if (canScroll) {
        el.scrollLeft = Math.max(0, Math.min(maxScroll, el.scrollLeft + dir * PAN_SPEED));
        rafRef.current = requestAnimationFrame(panStep);
        return;
      }
    }
    // Not panning this frame (out of zone, pressed, or at an end) — stop.
    rafRef.current = null;
  }, []);

  const startPan = useCallback(() => {
    if (rafRef.current === null && !pointerDownRef.current) {
      rafRef.current = requestAnimationFrame(panStep);
    }
  }, [panStep]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      lastClientXRef.current = e.clientX;
      const el = scrollRef.current;
      if (!el || pointerDownRef.current) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const inZone = x < EDGE_ZONE || x > rect.width - EDGE_ZONE;
      if (inZone) {
        // Dwell before panning so a click on a near-edge key isn't raced away.
        if (rafRef.current === null && dwellTimerRef.current === null) {
          dwellTimerRef.current = setTimeout(() => {
            dwellTimerRef.current = null;
            startPan();
          }, DWELL_MS);
        }
      } else {
        clearDwell();
      }
    },
    [startPan, clearDwell],
  );

  const handleMouseLeave = useCallback(() => {
    clearDwell();
    stopPan();
    lastClientXRef.current = null;
  }, [clearDwell, stopPan]);

  // Reset press state + cancel pan on pointer release anywhere / cancel / blur.
  useEffect(() => {
    const reset = () => {
      pointerDownRef.current = false;
    };
    window.addEventListener('pointerup', reset);
    window.addEventListener('pointercancel', reset);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('pointerup', reset);
      window.removeEventListener('pointercancel', reset);
      window.removeEventListener('blur', reset);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (dwellTimerRef.current !== null) clearTimeout(dwellTimerRef.current);
    };
  }, []);

  const handlePointerDown = useCallback(
    (midi: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      pointerDownRef.current = true;
      clearDwell();
      stopPan(); // pressing always halts panning
      playNote(midi);
      selectKey(midi);
    },
    [playNote, selectKey, clearDwell, stopPan],
  );

  const handlePointerUp = useCallback(
    (midi: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      pointerDownRef.current = false;
      if (!infiniteSustain) stopNote(midi);
    },
    [infiniteSustain, stopNote],
  );

  const handlePointerLeave = useCallback(
    (midi: number) => () => {
      // Only stop a note we are actively pressing — prevents scroll/hover-pan
      // from killing notes sounded by other sources (minimap, tuning sim).
      if (pointerDownRef.current && !infiniteSustain) {
        stopNote(midi);
      }
    },
    [infiniteSustain, stopNote],
  );

  const focusMidi = useCallback((midi: number) => {
    const nextMidi = Math.max(MIDI_LOWEST, Math.min(MIDI_C8, midi));
    selectKey(nextMidi);
    document.querySelector<HTMLElement>(`[data-midi="${nextMidi}"]`)?.focus();
  }, [selectKey]);

  const handleKeyDown = useCallback((midi: number) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        focusMidi(midi - 1);
        return;
      case 'ArrowRight':
        e.preventDefault();
        focusMidi(midi + 1);
        return;
      case 'Home':
        e.preventDefault();
        focusMidi(MIDI_LOWEST);
        return;
      case 'End':
        e.preventDefault();
        focusMidi(MIDI_C8);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        playNote(midi);
        selectKey(midi);
        return;
      default:
        return;
    }
  }, [focusMidi, playNote, selectKey]);

  const handleKeyUp = useCallback((midi: number) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !infiniteSustain) {
      e.preventDefault();
      stopNote(midi);
    }
  }, [infiniteSustain, stopNote]);

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'env(safe-area-inset-bottom)',
        touchAction: 'pan-x',
      }}
      ref={scrollRef}
      className="keyboard-scroll"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        style={{
          position: 'relative',
          width: totalWidth,
          height: whiteKeyHeight,
        }}
      >
        {/* White keys */}
        {whiteKeyPositions.map(({ midi, x }) => {
          const isActive = activeTones.has(midi);
          const isSelected = selectedKeyId === midi;
          const name = midiToNoteName(midi);
          const isALabel = name.startsWith('A');
          const isCommitted = isPlaying && tuningSimCompleted.has(midi);
          const isTarget = isPlaying && tuningSimTargetMidi === midi;

          return (
            <div
              key={midi}
              data-midi={midi}
              role="button"
              tabIndex={selectedKeyId === midi || (selectedKeyId === null && midi === MIDI_LOWEST) ? 0 : -1}
              aria-label={`Play ${name}`}
              aria-pressed={isActive}
              className={isTarget ? 'piano-key-target' : undefined}
              style={{
                position: 'absolute',
                left: x,
                top: 0,
                width: WHITE_KEY_WIDTH - 1,
                height: whiteKeyHeight,
                background: isActive
                  ? 'var(--color-accent, #4a9eff)'
                  : 'var(--color-text, #ffffff)',
                border: isSelected
                  ? '3px solid var(--color-accent, #4a9eff)'
                  : isTarget
                    ? '3px solid #ff6600'
                    : '1px solid #ccc',
                borderRadius: '0 0 4px 4px',
                cursor: 'pointer',
                userSelect: 'none',
                touchAction: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                paddingBottom: 8,
                boxSizing: 'border-box',
                zIndex: 1,
                transition: 'background 0.05s',
                animation: isTarget ? 'pulse-target 1.5s ease-in-out infinite' : undefined,
              }}
              onPointerDown={handlePointerDown(midi)}
              onPointerUp={handlePointerUp(midi)}
              onPointerLeave={handlePointerLeave(midi)}
              onKeyDown={handleKeyDown(midi)}
              onKeyUp={handleKeyUp(midi)}
            >
              {isALabel && (
                <span
                  style={{
                    fontSize: 10,
                    color: isActive ? '#fff' : '#333',
                    fontWeight: 600,
                    pointerEvents: 'none',
                  }}
                >
                  {name}
                </span>
              )}
              {isCommitted && (
                <span
                  style={{
                    fontSize: 12,
                    color: '#00e676',
                    pointerEvents: 'none',
                    marginTop: 2,
                  }}
                >
                  ✓
                </span>
              )}
            </div>
          );
        })}

        {/* Black keys */}
        {blackKeyPositions.map(({ midi, x }) => {
          const isActive = activeTones.has(midi);
          const isSelected = selectedKeyId === midi;
          const isCommitted = isPlaying && tuningSimCompleted.has(midi);
          const isTarget = isPlaying && tuningSimTargetMidi === midi;

          return (
            <div
              key={midi}
              data-midi={midi}
              role="button"
              tabIndex={selectedKeyId === midi ? 0 : -1}
              aria-label={`Play ${midiToNoteName(midi)}`}
              aria-pressed={isActive}
              className={isTarget ? 'piano-key-target' : undefined}
              style={{
                position: 'absolute',
                left: x,
                top: 0,
                width: BLACK_KEY_WIDTH,
                height: blackKeyHeight,
                background: isActive
                  ? 'var(--color-accent, #4a9eff)'
                  : '#1a1a2e',
                border: isSelected
                  ? '3px solid var(--color-accent, #4a9eff)'
                  : isTarget
                    ? '3px solid #ff6600'
                    : '1px solid #000',
                borderRadius: '0 0 3px 3px',
                cursor: 'pointer',
                userSelect: 'none',
                touchAction: 'none',
                zIndex: 2,
                boxSizing: 'border-box',
                transition: 'background 0.05s',
                animation: isTarget ? 'pulse-target 1.5s ease-in-out infinite' : undefined,
              }}
              onPointerDown={handlePointerDown(midi)}
              onPointerUp={handlePointerUp(midi)}
              onPointerLeave={handlePointerLeave(midi)}
              onKeyDown={handleKeyDown(midi)}
              onKeyUp={handleKeyUp(midi)}
            >
              {isCommitted && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 10,
                    color: '#00e676',
                    pointerEvents: 'none',
                  }}
                >
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
