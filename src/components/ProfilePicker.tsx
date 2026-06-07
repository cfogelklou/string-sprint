import { usePianoStore } from '@/store/pianoStore';
import { PROFILE_LABELS } from '@/bCoefficients/profiles';
import { PianoProfileName, PIANO_PROFILE_NAMES } from '@/types';

const PROFILE_KEYS: PianoProfileName[] = Object.values(PIANO_PROFILE_NAMES);

export default function ProfilePicker() {
  const activeProfile = usePianoStore((s) => s.activeProfile);
  const setProfile = usePianoStore((s) => s.setProfile);

  return (
    <select
      value={activeProfile}
      onChange={(e) => setProfile(e.target.value as PianoProfileName)}
      style={{
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 6,
        padding: '6px 10px',
        fontSize: 14,
        fontFamily: 'inherit',
        cursor: 'pointer',
        appearance: 'auto',
        outline: 'none',
      }}
    >
      {PROFILE_KEYS.map((key) => (
        <option key={key} value={key}>
          {PROFILE_LABELS[key]}
        </option>
      ))}
    </select>
  );
}
