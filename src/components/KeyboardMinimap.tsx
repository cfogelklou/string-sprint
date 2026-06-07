import { useCallback } from 'react';
import { usePianoStore } from '@/store/pianoStore';
import { MIDI_A0, NUM_KEYS } from '@/types';
import { isBlackKey } from '@/model/pianoNotes';

interface KeyboardMinimapProps {
  onJumpToNote: (midi: number) => void;
}

export default function KeyboardMinimap({ onJumpToNote }: KeyboardMinimapProps) {
  const selectedKeyId = usePianoStore((s) => s.selectedKeyId);
  const activeTones = usePianoStore((s) => s.activeTones);

  const handleClick = useCallback(
    (midi: number) => () => {
      onJumpToNote(midi);
    },
    [onJumpToNote],
  );

  // Count white keys for proportional layout
  let whiteCount = 0;
  const whiteIndices: Map<number, number> = new Map(); // midi -> white key index
  for (let i = 0; i < NUM_KEYS; i++) {
    const midi = MIDI_A0 + i;
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
      style={{
        width: '100%',
        maxWidth: totalWidth,
        height: 10,
        position: 'relative',
        background: '#e0e0e0',
        borderRadius: 2,
        overflow: 'hidden',
        margin: '0 auto',
        touchAction: 'none',
      }}
    >
      {/* White keys */}
      {Array.from(whiteIndices.entries()).map(([midi, idx]) => {
        const isActive = activeTones.has(midi);
        const isSelected = selectedKeyId === midi;

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
                : isActive
                  ? 'rgba(74, 158, 255, 0.5)'
                  : '#f5f5f5',
              boxSizing: 'border-box',
            }}
            onClick={handleClick(midi)}
          />
        );
      })}

      {/* Black keys */}
      {(() => {
        const blacks: { midi: number; x: number }[] = [];
        let wc = 0;
        for (let i = 0; i < NUM_KEYS; i++) {
          const midi = MIDI_A0 + i;
          if (isBlackKey(midi)) {
            blacks.push({ midi, x: wc * whiteKeyW - blackKeyW / 2 });
          } else {
            wc++;
          }
        }
        return blacks.map(({ midi, x }) => {
          const isActive = activeTones.has(midi);
          const isSelected = selectedKeyId === midi;

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
                  : isActive
                    ? 'rgba(74, 158, 255, 0.7)'
                    : '#1a1a2e',
                zIndex: 2,
                borderRadius: '0 0 1px 1px',
              }}
              onClick={handleClick(midi)}
            />
          );
        });
      })()}
    </div>
  );
}
