import { useCallback } from 'react';
import { usePianoStore } from '@/store/pianoStore';
import { MIDI_C8, MIDI_LOWEST, NUM_KEYS } from '@/types';
import { isBlackKey, midiAtIndex, midiToNoteName } from '@/model/pianoNotes';

interface KeyboardMinimapProps {
  onJumpToNote: (midi: number) => void;
}

export default function KeyboardMinimap({ onJumpToNote }: KeyboardMinimapProps) {
  const selectedKeyId = usePianoStore((s) => s.selectedKeyId);
  const activeTones = usePianoStore((s) => s.activeTones);
  const tuningSimPhase = usePianoStore((s) => s.tuningSimPhase);
  const tuningSimCompleted = usePianoStore((s) => s.tuningSimCompleted);

  const isPlaying = tuningSimPhase === 'playing';

  const selectMidi = useCallback((midi: number) => {
    onJumpToNote(Math.max(MIDI_LOWEST, Math.min(MIDI_C8, midi)));
  }, [onJumpToNote]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    selectMidi(midiAtIndex(Math.round(ratio * (NUM_KEYS - 1))));
  }, [selectMidi]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = selectedKeyId ?? MIDI_LOWEST;
    switch (event.key) {
      case 'ArrowLeft': case 'ArrowDown': event.preventDefault(); selectMidi(current - 1); return;
      case 'ArrowRight': case 'ArrowUp': event.preventDefault(); selectMidi(current + 1); return;
      case 'Home': event.preventDefault(); selectMidi(MIDI_LOWEST); return;
      case 'End': event.preventDefault(); selectMidi(MIDI_C8); return;
      default: return;
    }
  }, [selectMidi, selectedKeyId]);

  // Count white keys for proportional layout
  let whiteCount = 0;
  const whiteIndices: Map<number, number> = new Map(); // midi -> white key index
  for (let i = 0; i < NUM_KEYS; i++) {
    const midi = midiAtIndex(i);
    if (!isBlackKey(midi)) {
      whiteIndices.set(midi, whiteCount);
      whiteCount++;
    }
  }

  const totalWidth = 320; // Fixed minimap width in px
  const whiteKeyW = totalWidth / whiteCount;
  const blackKeyW = whiteKeyW * 0.6;

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Selected piano key"
      aria-valuemin={MIDI_LOWEST}
      aria-valuemax={MIDI_C8}
      aria-valuenow={selectedKeyId ?? MIDI_LOWEST}
      aria-valuetext={midiToNoteName(selectedKeyId ?? MIDI_LOWEST)}
      style={{
        width: '100%',
        maxWidth: totalWidth,
        height: 10,
        position: 'relative',
        background: 'var(--color-text, #e0e0e0)',
        borderRadius: 2,
        overflow: 'hidden',
        margin: '0 auto',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    >
      {/* White keys */}
      {Array.from(whiteIndices.entries()).map(([midi, idx]) => {
        const isActive = activeTones.has(midi);
        const isSelected = selectedKeyId === midi;
        const isCommitted = isPlaying && tuningSimCompleted.has(midi);

        return (
          <div
            key={midi}
            style={{
              position: 'absolute',
              left: idx * whiteKeyW,
              top: 0,
              width: whiteKeyW - 0.5,
              height: '100%',
              background: isSelected
                ? 'var(--color-accent, #4a9eff)'
                : isCommitted
                  ? 'var(--color-success-muted, rgba(0, 230, 118, 0.5))'
                  : isActive
                    ? 'var(--color-accent-muted, rgba(74, 158, 255, 0.5))'
                    : 'var(--color-key-white-bg, #f5f5f5)',
              boxSizing: 'border-box',
            }}
          />
        );
      })}

      {/* Black keys */}
      {(() => {
        const blacks: { midi: number; x: number }[] = [];
        let wc = 0;
        for (let i = 0; i < NUM_KEYS; i++) {
          const midi = midiAtIndex(i);
          if (isBlackKey(midi)) {
            blacks.push({ midi, x: wc * whiteKeyW - blackKeyW / 2 });
          } else {
            wc++;
          }
        }
        return blacks.map(({ midi, x }) => {
          const isActive = activeTones.has(midi);
          const isSelected = selectedKeyId === midi;
          const isCommitted = isPlaying && tuningSimCompleted.has(midi);

          return (
            <div
              key={midi}
              style={{
                position: 'absolute',
                left: x,
                top: 0,
                width: blackKeyW,
                height: '60%',
                background: isSelected
                  ? 'var(--color-accent, #4a9eff)'
                  : isCommitted
                    ? 'var(--color-success-muted, rgba(0, 230, 118, 0.5))'
                    : isActive
                      ? 'var(--color-accent-dim, rgba(74, 158, 255, 0.7))'
                      : 'var(--color-key-black, #1a1a2e)',
                zIndex: 2,
                borderRadius: '0 0 1px 1px',
              }}
            />
          );
        });
      })()}
    </div>
  );
}
