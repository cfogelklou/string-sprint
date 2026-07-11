import { useRef, useState, useEffect } from 'react';
import { usePianoStore } from '@/store/pianoStore';
import { MIDI_A0 } from '@/types';

/** Bassline sequence in the D1 key: D2 C2 B1 F1 G1 D#1 D1 (last note = D1). */
const BASSLINE_BASE = [38, 36, 35, 29, 31, 27, 26];
/** D1 midi (the final note of the base sequence). */
const D1_MIDI = 26;

/** ms between note onsets (start-to-start). */
const STEP_MS = 1500;
/** ms each note is held before it is released (must be < STEP_MS so there is a
 *  gap — the release fade — before the next note attacks). */
const GATE_MS = STEP_MS - 200;
/** ms the final note is held before release (held longer for a musical close). */
const LAST_HOLD_MS = STEP_MS + 800;

const VARIANT_D1 = { label: 'Bassline D1', offset: 0 } as const;
const VARIANT_A0 = {
  label: 'Bassline A0',
  // Transpose so the final note lands on A0.
  offset: MIDI_A0 - D1_MIDI,
} as const;
const VARIANTS = [VARIANT_D1, VARIANT_A0] as const;

export default function BasslineControls() {
  const playNote = usePianoStore((s) => s.playNote);
  const stopNote = usePianoStore((s) => s.stopNote);

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentMidiRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stop = () => {
    clearTimer();
    if (currentMidiRef.current !== null) {
      stopNote(currentMidiRef.current);
      currentMidiRef.current = null;
    }
    setActiveIdx(null);
  };

  useEffect(() => () => stop(), [stopNote]);

  const play = (variantIdx: number) => {
    clearTimer();
    if (currentMidiRef.current !== null) {
      stopNote(currentMidiRef.current);
      currentMidiRef.current = null;
    }
    const seq = BASSLINE_BASE.map((m) => m + VARIANTS[variantIdx].offset);
    setActiveIdx(variantIdx);

    let i = 0;
    // Attack note i, hold it, release it, then (unless it was the last) attack
    // the next after a gap so each release finishes before the next onset.
    const attack = () => {
      const midi = seq[i];
      currentMidiRef.current = midi;
      playNote(midi);

      const isLast = i === seq.length - 1;
      const holdMs = isLast ? LAST_HOLD_MS : GATE_MS;

      // Release the held note.
      timerRef.current = setTimeout(() => {
        stopNote(midi);
        currentMidiRef.current = null;
        if (isLast) {
          // Let the release tail finish, then reset the button.
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            setActiveIdx(null);
          }, 500);
        } else {
          // Gap before the next onset.
          timerRef.current = setTimeout(() => {
            i += 1;
            attack();
          }, STEP_MS - GATE_MS);
        }
      }, holdMs);
    };
    attack();
  };

  const onClick = (variantIdx: number) => {
    if (activeIdx === variantIdx) {
      stop();
    } else {
      play(variantIdx);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '6px 12px',
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-text-dim)',
      }}
    >
      {VARIANTS.map((v, idx) => {
        const isActive = activeIdx === idx;
        return (
          <button
            key={v.label}
            onClick={() => onClick(idx)}
            className={`controls-bar-btn${isActive ? ' active' : ''}`}
            style={{ flex: 1, padding: '8px 12px', fontSize: 13, fontWeight: 600 }}
          >
            {isActive ? `■ Stop ${v.label}` : `▶ ${v.label}`}
          </button>
        );
      })}
    </div>
  );
}
