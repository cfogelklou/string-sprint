# FakePiano PWA — Implementation Plan

## Context

Strobopro (strobe tuner app) needs a test tool that generates **precisely known** piano tones with inharmonicity. Real pianos are unpredictable — fakepiano produces sinusoids with exact B coefficients, enabling deterministic strobe pattern testing across two devices (fakepiano speaker → strobopro mic). Includes a tuning simulation game where notes start detuned and the user "tunes" them guided by strobopro.

## Tech Stack

- React 19.1 + Vite 7 + TypeScript 5.8 + Bun (matching zooked versions)
- Zustand for state
- Web Audio API for synthesis (no external audio libs)
- vite-plugin-pwa for PWA
- No react-native-web — plain React + HTML

## TypeScript Guidelines (from zooked/strobopro)

Follow `zooked/docs/guidelines-typescript.md` and `strobopro/docs/typescript-guidelines.md`:
- **No magic strings/numbers** — centralized `as const` objects with derived types
- **No `any`** — use specific types, `unknown` for external data
- **`DEFAULT_<TYPENAME>`** constants for complex interfaces
- **Switch over if/else** for mode/type branching
- **Extract to `const`** for null narrowing (no `!` assertions)
- **Wrapper component pattern** when hooks depend on validated data

## File Structure

```
fakepiano/
  index.html
  package.json
  vite.config.ts
  vitest.config.ts
  tsconfig.json / tsconfig.app.json / tsconfig.node.json
  eslint.config.js
  public/
    icon.svg
  src/
    main.tsx
    App.tsx
    App.css / index.css
    types/
      index.ts                    # All shared types & constants
    audio/
      audioEngine.ts              # Web Audio synthesis engine
      partialFreq.ts              # fₙ = n × f₁ × √((1 + B·n²) / (1 + B))
      envelope.ts                 # Physics-based amplitude decay per partial
      audioEngine.test.ts
    bCoefficients/
      profiles.ts                 # Copy of PIANO_B_PROFILES (6 profiles × 88 values)
      rigaud.ts                   # B(m) = exp(s_B·m + y_B) + exp(s_T·m + y_T)
      bCoefficients.test.ts
    model/
      pianoNotes.ts               # 88-key model, midi→freq, note names
      pianoNotes.test.ts
    store/
      pianoStore.ts               # Zustand store
    components/
      VirtualKeyboard.tsx         # Scrollable 88-key piano
      KeyboardMinimap.tsx         # Tiny 88-key navigation strip
      NoteSelector.tsx            # Precise note control
      ProfilePicker.tsx           # B profile preset dropdown
      BCurveEditor.tsx            # Bottom sheet: B curve chart + Rigaud params
      CentsJogWheel.tsx           # Horizontal inertial jog wheel for cents
      TuningSimPanel.tsx          # Tuning simulation game mode
      AudioStartOverlay.tsx       # Initial "START AUDIO" overlay
    hooks/
      useAudioEngine.ts           # Singleton AudioEngine lifecycle
      useTuningSimulation.ts      # Tuning sim state
```

## Dependency Graph

```
Phase 1: SCAFFOLD (single agent — creates directory, installs deps, writes configs)
    │
    ▼
Phase 2: FOUNDATION (3 parallel agents — pure functions, no cross-dependencies)
    ├─ Agent A: Audio math (partialFreq.ts, envelope.ts, audioEngine.test.ts)
    ├─ Agent B: B coefficients (profiles.ts, rigaud.ts, bCoefficients.test.ts)
    └─ Agent C: Piano model (pianoNotes.ts, pianoNotes.test.ts) + types (types/index.ts)
    │
    ▼
Phase 2-REVIEW: Reviewer checks Phase 2 output against strobopro source
    │
    ▼
Phase 3: INTEGRATION (2 parallel agents — depend on Phase 2 types)
    ├─ Agent D: Audio engine (audioEngine.ts) — uses partialFreq, envelope, AUDIO_CONFIG
    └─ Agent E: Zustand store (pianoStore.ts) — uses PianoKey, profiles, rigaud
    │
    ▼
Phase 3-REVIEW: Reviewer checks store + audio engine integration
    │
    ▼
Phase 4: UI (3 parallel agents — depend on store interface, not implementation)
    ├─ Agent F: Shell (App.tsx, main.tsx, App.css, index.css, AudioStartOverlay)
    ├─ Agent G: Piano UI (VirtualKeyboard, KeyboardMinimap, NoteSelector)
    └─ Agent H: Controls (CentsJogWheel, ProfilePicker, BCurveEditor, TuningSimPanel)
    │
    ▼
Phase 4-REVIEW: Reviewer checks all UI components
    │
    ▼
Phase 5: HOOKS + PWA (2 parallel agents)
    ├─ Agent I: Hooks (useAudioEngine.ts, useTuningSimulation.ts)
    └─ Agent J: PWA config + icon (vite.config.ts, vitest.config.ts, icon.svg)
    │
    ▼
Phase 5-REVIEW: Final reviewer — build verification, full integration check
```

---

## Phase 1: Scaffold (single agent)

### Agent 1-Scaffold

**Creates**: entire project directory structure, all config files, empty source files with correct imports.

**Tasks**:
1. Run `bun create vite fakepiano --template react-ts` from monorepo root
2. `cd fakepiano && bun add zustand && bun add -d vite-plugin-pwa vitest @testing-library/react @testing-library/jest-dom jsdom`
3. Write `vite.config.ts` — mirror zooked structure:
   - `base: '/fakepiano/'`
   - `@vitejs/plugin-react`
   - `VitePWA({ registerType: 'autoUpdate', manifest: { name: 'Fake Piano', short_name: 'FakePiano', display: 'standalone', orientation: 'portrait-primary' } })`
4. Write `tsconfig.json` with project references (tsconfig.app.json, tsconfig.node.json) — match zooked pattern
5. Write `vitest.config.ts` — jsdom environment, globals true — match strobopro pattern
6. Write `eslint.config.js` — flat config with typescript-eslint — match zooked pattern
7. Write `package.json` — name "fakepiano", homepage "https://applicaudia.se/fakepiano"
8. Create all empty source directories and placeholder files per file structure above
9. Write `src/types/index.ts` with all shared types (see Phase 2 Agent C spec)
10. Write `src/main.tsx` with React 19 createRoot pattern
11. Verify: `bun run build` succeeds (empty app compiles)

**Reference files**:
- `zooked/vite.config.ts` — Vite + VitePWA config pattern
- `zooked/package.json` — dependency versions
- `zooked/tsconfig.json` — TS config pattern
- `strobopro/vitest.config.ts` — Vitest config pattern

---

## Phase 2: Foundation (3 parallel agents)

### Agent 2A: Audio Math

**Creates**: `src/audio/partialFreq.ts`, `src/audio/envelope.ts`, `src/audio/audioEngine.test.ts`

**partialFreq.ts**:
```typescript
export function partialFreq(f1: number, B: number, n: number): number {
  return n * f1 * Math.sqrt((1 + B * n * n) / (1 + B));
}
```
Must match strobopro's `inharmonicity.ts:431`. IEEE 754 deterministic.

**envelope.ts**:
```typescript
export const AUDIO_CONFIG = {
  MAX_PARTIALS: 10,
  MAX_SIMULTANEOUS_TONES: 4,
  PARTIAL_AMPLITUDE_EXPONENT: 1.2,
  ATTACK_MS: 0.005,
  RELEASE_MS: 0.05,
} as const;

export function partialAmplitude(n: number): number {
  // Perceptual approximation of piano partial decay (between 1/n and 1/n^1.5)
  return 1 / Math.pow(n, AUDIO_CONFIG.PARTIAL_AMPLITUDE_EXPONENT);
}

export function centsToFreqRatio(cents: number): number {
  return Math.pow(2, cents / 1200);
}
```

**audioEngine.test.ts**: Test partialFreq matches strobopro (B=0 → integer harmonics, known values for A4 with specific B), test partialAmplitude decay curve, test centsToFreqRatio.

**Reference**: `strobopro/src/sharedSrc/src/instruments/inharmonicity.ts:431`

### Agent 2B: B Coefficients

**Creates**: `src/bCoefficients/profiles.ts`, `src/bCoefficients/rigaud.ts`, `src/bCoefficients/bCoefficients.test.ts`

**profiles.ts**:
```typescript
export const PIANO_PROFILE_NAMES = {
  CONCERT_GRAND: 'concertGrand',
  STUDIO_GRAND: 'studioGrand',
  BABY_GRAND: 'babyGrand',
  UPRIGHT: 'upright',
  CONSOLE: 'console',
  SPINET: 'spinet',
} as const;

export type PianoProfileName = typeof PIANO_PROFILE_NAMES[keyof typeof PIANO_PROFILE_NAMES];

export const PIANO_B_PROFILES: Record<PianoProfileName, number[]> = {
  // Copy ALL 88 values per profile from strobopro default_instruments.ts:14-93
};

export const PROFILE_LABELS: Record<PianoProfileName, string> = {
  [PIANO_PROFILE_NAMES.CONCERT_GRAND]: 'Concert Grand',
  // ...
};
```
**Array indexing**: index 0 = A0 (MIDI 21), index 87 = C8 (MIDI 108). Access: `B = profile[midiNote - MIDI_A0]`.
**profiles.ts is authoritative** (copied from strobopro). rigaud.ts for custom curves only.

**rigaud.ts**:
```typescript
export interface RigaudParams {
  s_B: number;
  y_B: number;
  s_T: number;
  y_T: number;
}

export const DEFAULT_RIGAUD_PARAMS: Record<PianoProfileName, RigaudParams> = {
  // From strobopro/docs/piano/inharmonicity-coefficients-gemini.md:
  // concertGrand: { s_B: -0.150, y_B: -5.00, s_T: 0.0926, y_T: -15.5223 }
  // ... all 6 profiles
};

export function rigaudB(midiNote: number, params: RigaudParams): number {
  return Math.exp(params.s_B * midiNote + params.y_B) +
         Math.exp(params.s_T * midiNote + params.y_T);
}

export function generateProfile(params: RigaudParams): number[] {
  // Generate 88 values for MIDI 21..108
}
```

**bCoefficients.test.ts**: Verify all 6 profiles have exactly 88 values. Verify Rigaud output matches profiles within tolerance. Verify U-shape (decreasing then increasing).

**Reference**: `strobopro/src/sharedSrc/src/instruments/default_instruments.ts:14-93`, `strobopro/docs/piano/inharmonicity-coefficients-gemini.md`

### Agent 2C: Piano Model + Types

**Creates**: `src/model/pianoNotes.ts`, `src/model/pianoNotes.test.ts`, `src/types/index.ts`

**types/index.ts** (shared types for all other modules):
```typescript
export const MIDI_A0 = 21;
export const MIDI_C8 = 108;
export const NUM_KEYS = 88;
export const DEFAULT_A4 = 440;

export interface PianoKey {
  midiNote: number;
  name: string;
  isBlack: boolean;
  fundamentalFreq: number;
  B: number;
  centsOffset: number;
}

export interface ToneConfig {
  frequency: number;
  B: number;
  centsOffset: number;
  numPartials: number;
  sustainDuration: number;
}

export const BREAKPOINTS = {
  MOBILE_PORTRAIT: 480,
  MOBILE_LANDSCAPE: 960,
} as const;
```

**pianoNotes.ts**:
```typescript
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function midiToFreq(midi: number, a4: number = DEFAULT_A4): number;
export function midiToNoteName(midi: number): string;
export function isBlackKey(midi: number): boolean;
export function generate88Keys(bProfile: number[]): PianoKey[];
```

**pianoNotes.test.ts**: Verify `midiToFreq(69) === 440`, `midiToNoteName(21) === 'A0'`, `midiToNoteName(108) === 'C8'`, black key detection, 88-key generation.

---

## Phase 2-REVIEW

**Reviewer agent** checks all Phase 2 output:
- partialFreq matches strobopro's implementation exactly
- PIANO_B_PROFILES data matches strobopro's arrays exactly (88 values each)
- Rigaud params match doc values
- Tests pass: `bun run test`
- No magic numbers, proper `as const` usage
- Types are correct and complete

---

## Phase 3: Integration (2 parallel agents)

### Agent 3D: Audio Engine

**Creates**: `src/audio/audioEngine.ts`

**Depends on**: partialFreq, envelope, types from Phase 2.

```typescript
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private activeTones: Map<number, { oscillators: OscillatorNode[]; gains: GainNode[] }>;
  private masterGain: GainNode | null = null;

  async init(): Promise<void>;           // Create AudioContext
  playTone(id: number, config: ToneConfig): void;
  stopTone(id: number): void;
  stopAll(): void;
  setMasterVolume(volume: number): void;
  dispose(): void;
}
```

**Critical rules**:
- OscillatorNodes are one-shot — create fresh each playTone(), dispose in stopTone()
- Cents applied AFTER B-stretch: `freq_n = partialFreq(f1, B, n) * centsToFreqRatio(centsOffset)`
- Anti-click: `gainNode.gain.setValueAtTime()` + `linearRampToValueAtTime()`
- Signal chain: Oscillator → partial Gain → tone Gain (envelope) → master Gain → destination
- Max 4 simultaneous tones × 10 partials = 40 concurrent oscillators max

### Agent 3E: Zustand Store

**Creates**: `src/store/pianoStore.ts`

**Depends on**: types, profiles, rigaud, pianoNotes from Phase 2.

```typescript
interface PianoState {
  isAudioInitialized: boolean;
  masterVolume: number;
  sustainDuration: number;
  numPartials: number;
  activeProfile: PianoProfileName;
  customParams: RigaudParams;
  useCustomProfile: boolean;
  keys: PianoKey[];
  selectedKeyId: number | null;
  activeTones: Map<number, ToneConfig>;
  tuningSimMode: boolean;
  tuningSimTargetMidi: number | null;
  tuningSimCompleted: Set<number>;
  isBCurveEditorOpen: boolean;
}
```

Actions: `initAudio`, `setProfile`, `selectKey(midi)`, `playNote(midi)`, `stopNote(midi)`, `stopAll`, `setCentsOffset(midi, cents)`, `setMasterVolume`, `setNumPartials`, `setCustomParam(key, value)`, `setUseCustomProfile`, `toggleBCurveEditor`, `enableTuningSim` (randomizes ±50 cents), `disableTuningSim`, `resetTuning`, `setTuningSimTarget(midi)`

`DEFAULT_PIANO_STATE` constant per TS guidelines.

---

## Phase 3-REVIEW

**Reviewer agent** checks:
- Store correctly uses types from Phase 2
- Audio engine correctly applies cents AFTER B-stretch
- Oscillator lifecycle (create/play/stop/dispose) is correct
- `DEFAULT_PIANO_STATE` exists
- No circular dependencies between modules
- `bun run build` still succeeds

---

## Phase 4: UI (3 parallel agents)

All UI agents share these **responsive design rules** (from Gemini UX consultation):
- **Design philosophy**: User's eyes are on another device. Muscle memory + no-look interactions. Bottom-heavy.
- **Breakpoints**: `< BREAKPOINTS.MOBILE_PORTRAIT` portrait stack, `< BREAKPOINTS.MOBILE_LANDSCAPE` landscape side-by-side, `>= BREAKPOINTS.MOBILE_LANDSCAPE` expanded
- All A keys labelled as octave reference markers

### Agent 4F: Shell

**Creates**: `src/App.tsx`, `src/App.css`, `src/index.css`, `src/components/AudioStartOverlay.tsx`

**App.tsx**: Responsive layout shell with header, status area, cents wheel area, keyboard area. Imports all components from 4G and 4H. AudioStartOverlay on first load.

**AudioStartOverlay**: Large centered "START AUDIO" button — initializes AudioContext on tap.

**App.css**: Layout grid/flexbox with media queries for 3 breakpoints. Mobile-first.

Layout wireframes (from plan section 8):
- Portrait: header → status → jog wheel → profile bar → minimap → keyboard
- Landscape: controls (40%) | keyboard (60%)
- Desktop: header → B curve → status|jog|sim → minimap → keyboard

### Agent 4G: Piano UI

**Creates**: `src/components/VirtualKeyboard.tsx`, `src/components/KeyboardMinimap.tsx`, `src/components/NoteSelector.tsx`

**VirtualKeyboard.tsx**:
- Scrollable 88-key piano (A0-C8), pure HTML/CSS divs
- All A keys labelled ("A0", "A1", ... "A7")
- White keys min 44px wide
- `touch-action: none`, `scroll-snap-type: x mandatory`
- `padding-bottom: env(safe-area-inset-bottom)` for iOS
- Active keys highlighted blue, selected key with border
- Auto-scroll to selected note

**KeyboardMinimap.tsx**:
- Tiny 88-key strip above keyboard
- Tap to jump keyboard scroll position
- Shows visible region indicator synced with VirtualKeyboard scroll

**NoteSelector.tsx**:
- Current note name, frequency display, partials count slider (1-10)

### Agent 4H: Controls

**Creates**: `src/components/CentsJogWheel.tsx`, `src/components/ProfilePicker.tsx`, `src/components/BCurveEditor.tsx`, `src/components/TuningSimPanel.tsx`

**CentsJogWheel.tsx**:
- Horizontal inertial jog wheel — swipe-based scrolling ruler
- Range -100 to +100 cents, 0.1 cent precision
- Large swipe area for one-handed use
- Digital readout center + moving ruler background
- Haptic feedback via `navigator.vibrate` per 1.0 cent increment (debounced on whole-cent crossing)
- Momentum physics: `velocity *= 0.95; position += velocity`
- Reset-to-0 button

**ProfilePicker.tsx**: Dropdown for 6 B profile presets. When changed, updates store.

**BCurveEditor.tsx**: Bottom sheet (slide-up drawer). Canvas chart showing B curve across 88 keys. 4 number inputs for Rigaud parameters when "Custom" selected. Faint overlay of all 6 presets for comparison.

**TuningSimPanel.tsx**: Enable/disable toggle, "Randomize" button, "Reset all to 0" button. Progress display (X/88). When active: highlights target key in blue, flashes green on ±0.1c held 1.5s, auto-advances.

---

## Phase 4-REVIEW

**Reviewer agent** checks:
- All components render without errors
- Responsive layout works at all 3 breakpoints
- CentsJogWheel gesture handling correct (touch events, momentum)
- VirtualKeyboard 88 keys with correct note names
- All A keys labelled
- BCurveEditor opens as bottom sheet
- TuningSimPanel game logic wired to store
- `bun run build` succeeds
- No hardcoded colors/spacing — use CSS custom properties or constants

---

## Phase 5: Hooks + PWA (2 parallel agents)

### Agent 5I: Hooks

**Creates**: `src/hooks/useAudioEngine.ts`, `src/hooks/useTuningSimulation.ts`

**useAudioEngine.ts**: Singleton AudioEngine lifecycle. `useRef` for engine instance. `init()` on AudioStartOverlay tap. Cleanup on unmount. Wires store actions to engine methods.

**useTuningSimulation.ts**: Reads store tuning sim state. `tunedCount` derives from `keys.filter(k => Math.abs(k.centsOffset) < 0.5)`. Success detection: tracks hold timer for ±0.1c over 1.5s.

### Agent 5J: PWA + Final Config

**Creates/updates**: `vite.config.ts` (finalize PWA), `public/icon.svg`

**vite.config.ts**: Finalize with VitePWA manifest (name, short_name, icons, display, orientation, theme_color). Workbox glob patterns.

**icon.svg**: Simple piano key SVG icon.

---

## Phase 5-REVIEW: Final

**Reviewer agent** checks:
- `bun run build` succeeds
- `bun run test` passes all tests
- All imports resolve (no circular deps)
- Store ↔ audio engine ↔ UI fully wired
- PWA manifest valid
- TypeScript strict mode, no `any`, no magic numbers
- `bun run dev` launches successfully

---

## Critical Reference Files

- `strobopro/src/sharedSrc/src/instruments/default_instruments.ts:14-93` — PIANO_B_PROFILES data
- `strobopro/src/sharedSrc/src/instruments/inharmonicity.ts:431` — partialFreq formula
- `strobopro/docs/piano/inharmonicity-coefficients-gemini.md` — Rigaud model params
- `zooked/vite.config.ts` — Vite + VitePWA config pattern
- `zooked/package.json` — dependency versions (React 19.1, Vite 7.1, TS 5.8)
- `zooked/docs/guidelines-typescript.md` — TypeScript coding standards
- `strobopro/docs/typescript-guidelines.md` — additional TS guidelines
- `strobopro/vite.config.ts` — Vite config alternative reference
- `strobopro/vitest.config.ts` — Vitest config reference

## Verification (after all phases complete)

1. Build: `cd fakepiano && bun run build` — must succeed
2. Unit tests: `bun run test` — partialFreq, midiToFreq, Rigaud, profile validation
3. Cross-device test: Play A4 on fakepiano with "Upright" profile → strobopro on different device with same profile should show stationary strobes at 0 cents error
4. Tuning sim: Randomize offsets → strobopro should show matching cents errors → adjust jog wheel to 0 → strobopro reads 0.0c
5. Key test: partial frequencies must match strobopro's partialFreq() output for same B and f1 inputs
