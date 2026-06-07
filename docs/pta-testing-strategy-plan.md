# PTA Testing Strategy for Fakepiano

## Context

Fakepiano generates tones with mathematically precise B values — it's a **deterministic test oracle** for Strobopro's Piano Tuning Assistant (PTA). PTA has a 5-step wizard (setup → bridge break → measure samples → review → apply). Currently fakepiano has tuning simulation but no PTA-specific test mode. Goal: add a gamified PTA test mode and a `docs/testing-strategy.md` document.

---

## Phase 1: Documentation

### Create `docs/testing-strategy.md`

Sections:
1. **Purpose** — fakepiano as ground-truth oracle for PTA testing
2. **Concept Coverage Map** — table mapping each PTA concept to testable behavior
3. **Test Scenarios** (TS-01 through TS-06):
   - TS-01: Profile tone verification (play note with known profile, strobopro reads 0¢)
   - TS-02: Octave style stretch (generate stretch with specific style, compare curves)
   - TS-03: Reference frequency shift (set A4=442, verify tracking)
   - TS-04: Bridge break identification (ascending notes, detect wound→plain)
   - TS-05: Sample note B measurement (known B, verify strobopro measurement)
   - TS-06: Full PTA workflow (all 5 steps end-to-end)
4. **Ground Truth Table** — B values for each profile at each of the 8 sample notes
5. **Tolerances** — B: ±10% or ±0.0002; stretch curve: ±0.5¢; ref freq: ±0.1Hz; bridge break: ±2 semitones

---

## Phase 2: PTA Math Layer

### New types in `src/types/index.ts`

**CRITICAL**: All note indices use MIDI numbers (21-108), matching fakepiano convention. Do NOT use strobopro's 1-based piano keys.

```typescript
// PTA piano types (6, matching all existing B profiles exactly)
export type PTAPianoType = PianoProfileName; // Reuse existing type — they're identical

// Octave styles (4, from strobopro)
export type OctaveStyle = '4:2' | '6:3' | 'pure-12ths' | 'concert-grand';

// PTA wizard steps
export type PTAStep = 'setup' | 'bridge-break' | 'measure' | 'review' | 'results';

// Bridge break defaults per piano type (in MIDI note numbers)
// Smaller piano → higher bridge break (wound strings extend further into keyboard)
export const PTA_BRIDGE_BREAK_DEFAULTS: Record<PianoProfileName, number> = {
  concertGrand: MIDI_A0 + 23, // MIDI 44 = C#3
  studioGrand: MIDI_A0 + 24,  // MIDI 45 = D3
  babyGrand: MIDI_A0 + 25,    // MIDI 46 = D#3
  upright: MIDI_A0 + 26,      // MIDI 47 = E3
  console: MIDI_A0 + 27,      // MIDI 48 = F3
  spinet: MIDI_A0 + 29,       // MIDI 50 = D3
};

// Sample notes for B measurement (MIDI note numbers)
// Converted from strobopro 1-based piano keys: pianoKey + 20 = MIDI
export const PTA_SAMPLE_NOTES = [
  { name: 'A1', midi: 33 },  // strobopro pianoKey 13
  { name: 'E2', midi: 40 },  // strobopro pianoKey 20
  { name: 'B2', midi: 47 },  // strobopro pianoKey 27
  { name: 'E3', midi: 52 },  // strobopro pianoKey 32
  { name: 'A3', midi: 57 },  // strobopro pianoKey 37
  { name: 'A4', midi: 69 },  // strobopro pianoKey 49
  { name: 'A5', midi: 81 },  // strobopro pianoKey 61
  { name: 'A6', midi: 93 },  // strobopro pianoKey 73
] as const;

// Profile array index = midi - MIDI_A0
// e.g., A4 (midi 69) → index 48

export const OCTAVE_ALIGNMENTS: Record<OctaveStyle, { lowerPartial: number; upperPartial: number; semitoneSpan: number }> = {
  '4:2': { lowerPartial: 4, upperPartial: 2, semitoneSpan: 12 },
  '6:3': { lowerPartial: 6, upperPartial: 3, semitoneSpan: 12 },
  'pure-12ths': { lowerPartial: 3, upperPartial: 1, semitoneSpan: 19 },
  'concert-grand': { lowerPartial: 4, upperPartial: 2, semitoneSpan: 12 },
};
```

### New file: `src/pta/ptaCalculations.ts`

Port from strobopro's `inharmonicity.ts` (lines 349-540). Pure math, no UI.

**All internal indexing uses 0-based array indices** (midi - MIDI_A0). Convert at boundaries.

Functions to implement:
- `interpolateBCoefficients(samples, bridgeBreakMidi)` — piecewise log-linear, split at bridge break
  - Splits bass (notes < bridgeBreakMidi) and treble (notes >= bridgeBreakMidi)
  - **Must clamp B to epsilon 0.00001 before log** to avoid -Infinity (strobopro L414-416)
  - Returns `number[]` (88 values, index 0 = A0)
- `calculateRailsbackOffset(bValues, octaveStyle, referenceFreq)` — propagate from A4 outward
  - Uses semitone-by-semitone propagation (NOT the per-note approach in existing `stretchTargets.ts`)
  - A4 index = 48 (MIDI 69 - 21)
  - Falls back to ET (cents=0) when anchor outside range
  - `getAlignment(noteIndex, style)` — concert-grand uses 6:3 below key 28 (1-based, i.e. array index < 27), 4:2 at and above
- `computeTargetFrequency(fLower, bLower, bUpper, alignment)` — exact formula from strobopro L439-448:
  ```
  f = (n/m) × f_lower × sqrt((1 + B_L×n²)(1 + B_U)) / sqrt((1 + B_L)(1 + B_U×m²))
  ```
- `solveForLowerFrequency(fUpper, bLower, bUpper, alignment)` — inverse for downward propagation
- `gradeBridgeBreak(userAnswer, correctAnswer)` — returns semitone distance + grade
- `gradeSampleMeasurements(samples)` — returns mean relative error + grade

**Key difference from existing `stretchTargets.ts`**: Current `computeTargets` does per-note partial alignment (independent calculation per key). PTA version accumulates stretch by walking outward from A4 — each note's target depends on the previous note's stretched frequency. Both coexist; PTA math lives in `src/pta/`.

### New file: `src/pta/ptaCalculations.test.ts`

Test:
- Interpolated B matches profile data when all 88 B values provided as "samples"
- Stretch curves have correct shape (bass flat, treble sharp) for each octave style
- Different octave styles produce different curves (6:3 wider than 4:2)
- Bridge break split produces discontinuity at the right point
- Pure-12ths uses 19-semitone span
- Epsilon clamp prevents NaN on B=0

---

## Phase 3: Store Extension

### New file: `src/store/ptaStore.ts`

**Separate Zustand store** for PTA state (avoids bloating pianoStore). Contains:
- `referenceFreq: number` (default 440)
- `ptaActive: boolean`
- `ptaState: PTAState` (the wizard step state)

`PTAState` interface:
```typescript
interface PTAState {
  step: PTAStep;
  pianoType: PianoProfileName;
  octaveStyle: OctaveStyle;
  referenceFreq: number;
  bridgeBreakNote: number;         // MIDI note number
  samples: PTASampleMeasurement[];  // 8 sample measurements
  interpolatedB: number[];          // 88 B values after interpolation
  stretchCurve: number[];           // 88 cents offsets
  bridgeBreakUserAnswer: number | null;
  bridgeBreakScore: number | null;
  measurementScore: number | null;
  overallGrade: string | null;
}
```

Actions:
- `setReferenceFreq(freq)` — updates `referenceFreq`
- `startPTAMode()` — guard: calls `usePianoStore.getState().stopTuningSim()` first if tuning sim active, then initializes PTA state
- `stopPTAMode()` — sets `ptaActive = false`, clears PTA state, stops all tones via `usePianoStore.getState().stopAll()`
- `ptaSetPianoType(type)` — sets type, loads corresponding B profile into pianoStore
- `ptaSetOctaveStyle(style)`
- `ptaSubmitBridgeBreak(midiNote)` — scores against PTA_BRIDGE_BREAK_DEFAULTS[type]
- `ptaCaptureSample(midi, measuredB)` — looks up true B from profile array at index (midi - MIDI_A0), stores comparison
- `ptaGenerateCurve()` — runs interpolation + calculateRailsbackOffset
- `ptaGoToStep(step)`

### Modify `src/store/pianoStore.ts`

Minimal changes:
- Add `referenceFreq: number` (default 440) to state
- `playNote`: change `midiToFreq(midi)` → `midiToFreq(midi, get().referenceFreq)`
- `setReferenceFreq(freq)`: update field + regenerate keys preserving centsOffsets (use existing `regenerateKeys` pattern, pass `a4` through)
- Export `usePianoStore` for ptaStore to call into

### Modify `src/model/pianoNotes.ts`

- `generate88Keys(bProfile, a4 = DEFAULT_A4)` — accept optional `a4` param, pass to `midiToFreq(midi, a4)`
- `regenerateKeys` in pianoStore also needs `a4` param threaded through

---

## Phase 4: PTA Wizard UI

### New components

| Component | Purpose |
|-----------|---------|
| `src/components/PTAWizard.tsx` | Bottom sheet container. **Must implement BCurveEditor's swipe-to-dismiss pattern** (touch handlers, 80px threshold). Step indicator dots between title and close button. z-index 102+ (above BCurveEditor at 100-101). |
| `src/components/PTASetupStep.tsx` | Piano type chips (6), octave style chips (4), ref freq input (430-450Hz, presets 440/442/443) |
| `src/components/PTABridgeBreakStep.tsx` | Mini-keyboard E2-C4 range. Auto-play ascending notes with **200ms gap** (respecting MAX_SIMULTANEOUS_TONES=4 — stop previous note before playing next). User taps break point. |
| `src/components/PTAMeasureStep.tsx` | 8 sample notes. Per note: play button, B input field (validate: 0.00001-0.1 range). Progress: "N/8 measured". Color: green <5%, yellow 5-10%, red >10% error. Min 3 to proceed. |
| `src/components/PTAReviewStep.tsx` | **Dual-curve chart**: B curve + stretch curve on separate canvases (reuse BCurveEditor drawing logic). Summary stats below. |
| `src/components/PTAResultsStep.tsx` | Overall grade display. **Reuse TuningSimResultsPanel's StatRow pattern and gradeColor function** (same color palette #00e676/#ffaa00/#ff4444). Per-step breakdown. |

### Modify existing

- `TuningSimPanel.tsx` — add "PTA Test" button visible in all phases (not just idle), using same button styling as existing controls
- `App.tsx` — render `{ptaActive && <PTAWizard />}` in overlay area, same pattern as BCurveEditor

### Scoring

| Step | Metric | A+ | A | B | C | D | F |
|------|--------|----|---|---|---|---|---|
| Bridge Break | Semitones off | 0 | 1 | 2 | 3 | 4 | 5+ |
| Sample Notes | Mean relative B error | <2% | <5% | <10% | <15% | <25% | ≥25% |
| Overall | Weighted: Bridge 20%, Measurement 50%, Review 30% | — | — | — | — | — | — |

Review step scoring: informational, no pass/fail. Shows curve shape and max stretch for visual comparison.

---

## Phase 5: Integration & Wiring

- Wire PTA wizard into `App.tsx` — `{ptaActive && <PTAWizard />}`
- Wire `referenceFreq` through store chain: ptaStore.setReferenceFreq → pianoStore.setReferenceFreq → regenerateKeys → generate88Keys(bProfile, a4)
- Entry point: "PTA Test" button in `TuningSimPanel.tsx`, calls `ptaStore.startPTAMode()`
- Guard: `startPTAMode` calls `pianoStore.stopTuningSim()` if sim active

---

## Key Files Summary

**New files** (10):
- `docs/testing-strategy.md`
- `src/pta/ptaCalculations.ts`
- `src/pta/ptaCalculations.test.ts`
- `src/store/ptaStore.ts`
- `src/components/PTAWizard.tsx`
- `src/components/PTASetupStep.tsx`
- `src/components/PTABridgeBreakStep.tsx`
- `src/components/PTAMeasureStep.tsx`
- `src/components/PTAReviewStep.tsx`
- `src/components/PTAResultsStep.tsx`

**Modified files** (5):
- `src/types/index.ts` — PTA types, constants, sample notes (MIDI-indexed)
- `src/store/pianoStore.ts` — `referenceFreq` field, `setReferenceFreq` action, `playNote` uses referenceFreq
- `src/model/pianoNotes.ts` — `generate88Keys(bProfile, a4?)` optional param
- `src/components/TuningSimPanel.tsx` — PTA entry button (visible in all phases)
- `src/App.tsx` — render PTAWizard overlay

**Reference (read-only)**:
- `strobopro/src/sharedSrc/src/instruments/inharmonicity.ts` — source of PTA math to port (lines 349-540)
- `strobopro/src/sharedSrc/src/mobile/abstractions/screens/piano_tuning_assistant.tsx` — wizard flow reference

**Reused unchanged**: audioEngine, partialFreq, envelope, CentsJogWheel, VirtualKeyboard, KeyboardMinimap, existing tuning sim code.

---

## Review Fixes Applied

| Issue | Source | Fix |
|-------|--------|-----|
| Index mismatch: strobopro uses 1-based piano keys, fakepiano uses MIDI | Math review | All PTA_SAMPLE_NOTES use MIDI numbers. Bridge break defaults in MIDI. Internal arrays use 0-based (midi - MIDI_A0). |
| referenceFreq not propagated to playNote | Store review | `playNote` calls `midiToFreq(midi, get().referenceFreq)`. `setReferenceFreq` regenerates keys. |
| PTA vs tuning sim conflict | Store review | `startPTAMode()` calls `stopTuningSim()` first. |
| Store bloat from PTA state | Store review | Separate `src/store/ptaStore.ts` Zustand store. |
| Missing cleanup in stopPTAMode | Store review | Stops all tones, clears PTA state, sets ptaActive=false. |
| B=0 causes -Infinity in log interpolation | Math review | Epsilon clamp to 0.00001 before `Math.log()` (match strobopro L414). |
| Swipe-to-dismiss not implemented | UI review | PTAWizard copies BCurveEditor's touch handler pattern exactly. |
| B input validation missing | UI review | Validate input range 0.00001-0.1, show error feedback. |
| Dual-curve rendering needed | UI review | PTAReviewStep uses two separate canvases for B curve and stretch curve. |
| Scoring colors inconsistent | UI review | Reuse TuningSimResultsPanel's gradeColor function and StatRow component. |
| Concert-grand boundary inclusive? | Math review | `< 28` (1-based) = array index `< 27` gets 6:3; index >= 27 gets 4:2. |

---

## Verification

1. `bun run test` — all existing + new PTA calculation tests pass
2. `bun run lint` — no new warnings
3. `bun run dev` — PTA wizard accessible, 5 steps navigable
4. Manual: set Spinet profile, A4=442, 4:2 octave style → play A4 → strobopro reads 0¢ at 442Hz
5. Manual: bridge break step → ascending playback, user identifies break within 2 semitones
6. Manual: measure step → play sample notes, enter B values from strobopro, compare to ground truth
7. Verify referenceFreq change regenerates all key frequencies without losing cents offsets
8. Verify PTA mode and tuning sim are mutually exclusive (starting one stops the other)
