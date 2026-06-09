import { usePTAStore } from '@/store/ptaStore';
import { usePianoStore } from '@/store/pianoStore';
import { PIANO_PROFILE_NAMES } from '@/types';
import { PROFILE_LABELS } from '@/bCoefficients/profiles';
import type { OctaveStyle } from '@/types';

const PIANO_TYPES = [
  PIANO_PROFILE_NAMES.CONCERT_GRAND,
  PIANO_PROFILE_NAMES.STUDIO_GRAND,
  PIANO_PROFILE_NAMES.BABY_GRAND,
  PIANO_PROFILE_NAMES.UPRIGHT,
  PIANO_PROFILE_NAMES.CONSOLE,
  PIANO_PROFILE_NAMES.SPINET,
  PIANO_PROFILE_NAMES.OTHER,
] as const;

const OCTAVE_STYLES: { value: OctaveStyle; label: string }[] = [
  { value: '4:2', label: '4:2' },
  { value: '6:3', label: '6:3' },
  { value: 'pure-12ths', label: 'Pure 12ths' },
  { value: 'concert-grand', label: 'Concert Grand' },
];

const REF_FREQ_PRESETS = [440, 442, 443];

export default function PTASetupStep() {
  const { ptaState, ptaSetPianoType, ptaSetOctaveStyle } = usePTAStore();
  const { referenceFreq, setReferenceFreq } = usePianoStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Piano type */}
      <div>
        <label style={{
          display: 'block',
          fontSize: 12,
          color: 'var(--color-text-dim)',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          Piano Type
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PIANO_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => ptaSetPianoType(type)}
              style={{
                padding: '6px 12px',
                borderRadius: 16,
                border: '1px solid',
                borderColor: ptaState.pianoType === type
                  ? 'var(--color-accent)'
                  : 'var(--color-text-dim)',
                background: ptaState.pianoType === type
                  ? 'rgba(0, 230, 118, 0.15)'
                  : 'transparent',
                color: ptaState.pianoType === type
                  ? 'var(--color-accent)'
                  : 'var(--color-text)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {PROFILE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Octave style */}
      <div>
        <label style={{
          display: 'block',
          fontSize: 12,
          color: 'var(--color-text-dim)',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          Octave Style
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {OCTAVE_STYLES.map((os) => (
            <button
              key={os.value}
              onClick={() => ptaSetOctaveStyle(os.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 16,
                border: '1px solid',
                borderColor: ptaState.octaveStyle === os.value
                  ? 'var(--color-accent)'
                  : 'var(--color-text-dim)',
                background: ptaState.octaveStyle === os.value
                  ? 'rgba(0, 230, 118, 0.15)'
                  : 'transparent',
                color: ptaState.octaveStyle === os.value
                  ? 'var(--color-accent)'
                  : 'var(--color-text)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {os.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 6 }}>
          Which partials to align for the stretch curve. 4:2 is standard.
        </p>
      </div>

      {/* Reference frequency */}
      <div>
        <label style={{
          display: 'block',
          fontSize: 12,
          color: 'var(--color-text-dim)',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          Reference Frequency (A4)
        </label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="number"
            value={referenceFreq}
            onChange={(e) => setReferenceFreq(Number(e.target.value))}
            min={430}
            max={450}
            step={0.1}
            style={{
              width: 80,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid var(--color-text-dim)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: 14,
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>Hz</span>
          {REF_FREQ_PRESETS.filter((f) => f !== referenceFreq).map((f) => (
            <button
              key={f}
              onClick={() => setReferenceFreq(f)}
              style={{
                padding: '4px 10px',
                borderRadius: 12,
                border: '1px solid var(--color-text-dim)',
                background: 'transparent',
                color: 'var(--color-text)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 6 }}>
          Most pianos use 440 Hz. Some orchestras use 442 or 443.
        </p>
      </div>
    </div>
  );
}
