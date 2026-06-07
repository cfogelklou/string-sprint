import { useRef, useEffect, useCallback, useState } from 'react';
import { usePianoStore } from '@/store/pianoStore';
import { MIDI_A0, NUM_KEYS } from '@/types';
import { midiToNoteName, isBlackKey } from '@/model/pianoNotes';

const WHITE_KEY_WIDTH = 44;
const BLACK_KEY_WIDTH = 28;
const MIN_WHITE_HEIGHT = 100;
const MIN_BLACK_HEIGHT = 60;

export default function VirtualKeyboard() {
  const scrollRef = useRef<HTMLDivElement>(null);
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

  const isPlaying = tuningSimPhase === 'playing';

  // Build layout: positions for white keys and black keys
  const whiteKeyPositions: { midi: number; x: number; index: number }[] = [];
  const blackKeyPositions: { midi: number; x: number; whiteIndex: number }[] = [];

  let whiteCount = 0;
  for (let i = 0; i < NUM_KEYS; i++) {
    const midi = MIDI_A0 + i;
    if (!isBlackKey(midi)) {
      whiteKeyPositions.push({ midi, x: whiteCount * WHITE_KEY_WIDTH, index: whiteCount });
      whiteCount++;
    }
  }

  // Black keys positioned between adjacent white keys
  whiteCount = 0;
  for (let i = 0; i < NUM_KEYS; i++) {
    const midi = MIDI_A0 + i;
    if (isBlackKey(midi)) {
      const x = whiteCount * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2;
      blackKeyPositions.push({ midi, x, whiteIndex: whiteCount });
    } else {
      whiteCount++;
    }
  }

  const totalWidth = whiteKeyPositions.length * WHITE_KEY_WIDTH;

  // Auto-scroll to selected key
  useEffect(() => {
    if (selectedKeyId === null || !scrollRef.current) return;
    const container = scrollRef.current;
    const containerWidth = container.clientWidth;

    let targetX: number | undefined;
    const whiteEntry = whiteKeyPositions.find((w) => w.midi === selectedKeyId);
    if (whiteEntry) {
      targetX = whiteEntry.x;
    } else {
      const blackEntry = blackKeyPositions.find((b) => b.midi === selectedKeyId);
      if (blackEntry) {
        targetX = blackEntry.x;
      }
    }

    if (targetX !== undefined) {
      const scrollLeft = targetX - containerWidth / 2 + WHITE_KEY_WIDTH / 2;
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKeyId]);

  const handlePointerDown = useCallback(
    (midi: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      playNote(midi);
      selectKey(midi);
    },
    [playNote, selectKey],
  );

  const handlePointerUp = useCallback(
    (midi: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      stopNote(midi);
    },
    [stopNote],
  );

  const handlePointerLeave = useCallback(
    (midi: number) => () => {
      stopNote(midi);
    },
    [stopNote],
  );

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x mandatory',
        paddingBottom: 'env(safe-area-inset-bottom)',
        touchAction: 'pan-x',
      }}
      ref={scrollRef}
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
                scrollSnapAlign: 'start',
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
                scrollSnapAlign: 'start',
                zIndex: 2,
                boxSizing: 'border-box',
                transition: 'background 0.05s',
                animation: isTarget ? 'pulse-target 1.5s ease-in-out infinite' : undefined,
              }}
              onPointerDown={handlePointerDown(midi)}
              onPointerUp={handlePointerUp(midi)}
              onPointerLeave={handlePointerLeave(midi)}
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
