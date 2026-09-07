import { useCallback, useEffect, useRef } from 'react';
import { usePianoStore } from '@/store/pianoStore';
import { keyIndexOf } from '@/model/pianoNotes';

const MIN_CENTS = -100;
const MAX_CENTS = 100;
const SMALL_STEP = 0.1;
const LARGE_STEP = 1;
const COARSE_STEP = 5;
const FINE_STEP = 0.01;
const DIAL_RADIUS = 56;
const CENTS_PER_TURN = 120;

const FINE_STEPS = [
  { label: '+5¢', delta: COARSE_STEP, variant: 'plus' },
  { label: '−5¢', delta: -COARSE_STEP, variant: 'minus' },
  { label: '+1¢', delta: LARGE_STEP, variant: 'plus' },
  { label: '−1¢', delta: -LARGE_STEP, variant: 'minus' },
  { label: '+0.1¢', delta: SMALL_STEP, variant: 'plus' },
  { label: '−0.1¢', delta: -SMALL_STEP, variant: 'minus' },
  { label: '+0.01¢', delta: FINE_STEP, variant: 'plus' },
  { label: '−0.01¢', delta: -FINE_STEP, variant: 'minus' },
] as const;

function clampCents(value: number): number {
  return Math.round(Math.min(MAX_CENTS, Math.max(MIN_CENTS, value)) * 100) / 100;
}

function pointerAngle(element: HTMLElement, clientX: number, clientY: number): number {
  const rect = element.getBoundingClientRect();
  return Math.atan2(clientY - rect.top - rect.height / 2, clientX - rect.left - rect.width / 2);
}

function angleDelta(previous: number, next: number): number {
  let delta = next - previous;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

export default function CentsJogWheel() {
  const selectedKeyId = usePianoStore((state) => state.selectedKeyId);
  const keys = usePianoStore((state) => state.keys);
  const tuningSimPhase = usePianoStore((state) => state.tuningSimPhase);
  const setCentsOffset = usePianoStore((state) => state.setCentsOffset);
  const playNote = usePianoStore((state) => state.playNote);
  const stopNote = usePianoStore((state) => state.stopNote);
  const lastAngleRef = useRef<number | null>(null);

  const keyIndex = selectedKeyId === null ? -1 : keyIndexOf(selectedKeyId);
  const currentCents = keyIndex >= 0 && keyIndex < keys.length ? keys[keyIndex].centsOffset : 0;
  const isPractice = tuningSimPhase === 'playing';
  const hasSelection = selectedKeyId !== null;

  const setCents = useCallback((value: number) => {
    if (selectedKeyId !== null) setCentsOffset(selectedKeyId, clampCents(value));
  }, [selectedKeyId, setCentsOffset]);

  const nudge = useCallback((delta: number) => {
    if (selectedKeyId === null) return;
    setCents(currentCents + delta);
    stopNote(selectedKeyId);
    window.setTimeout(() => playNote(selectedKeyId), 20);
  }, [currentCents, playNote, selectedKeyId, setCents, stopNote]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (selectedKeyId === null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    lastAngleRef.current = pointerAngle(event.currentTarget, event.clientX, event.clientY);
  }, [selectedKeyId]);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (selectedKeyId === null) return;
    const previous = lastAngleRef.current;
    if (previous === null) return;
    const next = pointerAngle(event.currentTarget, event.clientX, event.clientY);
    lastAngleRef.current = next;
    setCents(currentCents + (angleDelta(previous, next) / (Math.PI * 2)) * CENTS_PER_TURN);
  }, [currentCents, selectedKeyId, setCents]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (selectedKeyId === null) return;
    const step = event.shiftKey ? LARGE_STEP : SMALL_STEP;
    switch (event.key) {
      case 'ArrowUp': case 'ArrowRight': event.preventDefault(); nudge(step); return;
      case 'ArrowDown': case 'ArrowLeft': event.preventDefault(); nudge(-step); return;
      case 'PageUp': event.preventDefault(); nudge(COARSE_STEP); return;
      case 'PageDown': event.preventDefault(); nudge(-COARSE_STEP); return;
      case 'Home': event.preventDefault(); setCents(MIN_CENTS); return;
      case 'End': event.preventDefault(); setCents(MAX_CENTS); return;
      default: return;
    }
  }, [nudge, selectedKeyId, setCents]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement) return;
      switch (event.key.toLowerCase()) {
        case 'q': nudge(LARGE_STEP); break; case 'a': nudge(-LARGE_STEP); break;
        case 'w': nudge(SMALL_STEP); break; case 's': nudge(-SMALL_STEP); break;
        case 'e': nudge(FINE_STEP); break; case 'd': nudge(-FINE_STEP); break;
        case 'r': setCents(0); break; default: return;
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [nudge, setCents]);

  const valueText = `${currentCents >= 0 ? '+' : ''}${currentCents.toFixed(2)}¢`;
  const accessibility = isPractice
    ? { role: 'group' as const, 'aria-label': 'Cents jog wheel. Use arrow keys or precision buttons to tune the selected note.' }
    : {
        role: 'slider' as const,
        'aria-label': hasSelection ? 'Cents jog wheel' : 'Cents jog wheel (no key selected)',
        'aria-valuemin': MIN_CENTS,
        'aria-valuemax': MAX_CENTS,
        'aria-valuenow': currentCents,
        'aria-valuetext': `${currentCents >= 0 ? 'plus ' : ''}${currentCents.toFixed(2)} cents`,
      };

  return (
    <section className="jog-wheel" aria-label="Cents adjustment">
      <div className="jog-wheel-center">
        <div
          {...accessibility}
          tabIndex={0}
          className={`jog-wheel-dial${!hasSelection ? ' disabled' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => { lastAngleRef.current = null; }}
          onPointerCancel={() => { lastAngleRef.current = null; }}
          onKeyDown={onKeyDown}
        >
          <span className="jog-wheel-index" aria-hidden="true" />
          {Array.from({ length: 24 }, (_, index) => (
            <span
              key={index}
              aria-hidden="true"
              className={index % 3 === 0 ? 'jog-wheel-tick jog-wheel-tick-major' : 'jog-wheel-tick'}
              style={{ transform: `rotate(${index * 15}deg) translateY(-${DIAL_RADIUS}px)` }}
            />
          ))}
          <div className="jog-wheel-readout">
            <span>
              {isPractice ? 'Tune this note' : hasSelection ? `MIDI ${selectedKeyId}` : 'Select key'}
            </span>
            <strong>{isPractice ? 'Use your ear' : hasSelection ? valueText : '--¢'}</strong>
            <small>
              {isPractice ? 'Turn or nudge' : hasSelection ? 'clockwise sharpens' : 'Select a piano key to tune it'}
            </small>
          </div>
        </div>
        {!isPractice && (
          <button
            className="jog-wheel-reset"
            type="button"
            onClick={() => setCents(0)}
            disabled={!hasSelection}
          >
            Reset to 0¢
          </button>
        )}
      </div>

      <div className="jog-wheel-steps-grid" aria-label="Fine cents adjustment">
        {FINE_STEPS.map(({ label, delta, variant }) => (
          <button
            key={label}
            type="button"
            className={`jog-wheel-step-btn btn-${variant}`}
            onClick={() => nudge(delta)}
            disabled={!hasSelection}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
