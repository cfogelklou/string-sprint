# UI hardening — milestone notes

Working artifact protecting against lost context while implementing `docs/plan-ui-hardening-followups.md`.

## Epic Milestone Progression

- [x] **M1 (Infinite Sustain Semantics)**: Normal-key release and mode-disable tone stop semantics across store and audio engine.
- [x] **M2 (A11y & Interaction Evidence)**: Component-level accessibility and interaction tests for VirtualKeyboard, KeyboardMinimap, CentsJogWheel, Dialogs, and Ad absence.
- [x] **M3 (Responsive & Reduced-Motion UAT)**: Viewport matrix (320x320, 320x568, 390x844, desktop) and reduced-motion UAT.
- [x] **M4 (Semantic-Token Migration)**: Semantic tokens for shared status, overlay, and control colors; static design & unslop verification.

---

## Milestone 1 (Infinite Sustain Semantics) — Completed

### Milestone log
- Updated `usePianoStore.setInfiniteSustain(false)` to clear active tones lacking explicit `infiniteSustain: true`.
- Preserved custom tones (e.g. Crazy Strobe Test) which specify `infiniteSustain: true`.
- Added unit tests in `src/store/pianoStore.test.ts`.
- Added UI component regression test in `src/components/VirtualKeyboard.layout.test.tsx`.
- Added integration test at the audio engine sync seam in `src/audio/audioSync.test.ts`.
- All 135 tests passing.
- REQ-UI-008 and SCN-UI-005 verified: `Impl ✅ | Test ✅`.

---

## Milestone 2 (A11y & Interaction Evidence) — Completed

### Milestone log
- Added `src/components/VirtualKeyboard.a11y.test.tsx`: roving tabindex, Arrow/Home/End navigation, Enter/Space activation, accessible names and aria-pressed.
- Added `src/components/KeyboardMinimap.a11y.test.tsx`: slider role, min/max/current values, pointer selection, Arrow/Home/End changes.
- Added `src/components/CentsJogWheel.a11y.test.tsx`: normal mode slider role and value, keyboard increments, practice mode group role with hidden numeric feedback, all 6 precision buttons and reset.
- Added `src/components/Dialogs.a11y.test.tsx`: HelpSheet and PTAWizard modal dialogs, Escape key close, close button close, and focus restoration to opener.
- Added `src/App.noAds.test.tsx`: verified no ad DOM elements, no `adsbygoogle` class/tag, and no `adsbygoogle` window initialization.
- All 153 tests passing across 18 test files.
- REQ-UI-001, REQ-UI-002, REQ-UI-003, REQ-UI-007, REQ-UI-009 verified: `Impl ✅ | Test ✅`.
- SCN-UI-001, SCN-UI-002, SCN-UI-004, SCN-UI-006 verified.

---

## Milestone 3 (Responsive & Reduced-Motion UAT) — Completed

### Milestone log
- Updated `src/index.css` with short viewport responsive media query (`@media (max-height: 520px)` with `overflow-y: auto`) and verified `@media (prefers-reduced-motion: reduce)` static target key highlight.
- Added automated test suite `src/responsive.test.ts` for CSS responsive rules and media queries.
- Updated `REQ-UI-004, REQ-UI-005` and `SCN-UI-003` to `Impl ✅ | Test ✅`.

---

## Milestone 4 (Semantic-Token Migration) — Completed

### Milestone log
- Defined comprehensive semantic CSS custom properties in `:root` in `src/index.css` covering status indicators, control accents, modal overlays, surfaces, text, and key states.
- Migrated inline and component hex colors across `VirtualKeyboard.tsx`, `KeyboardMinimap.tsx`, `HelpSheet.tsx`, `PTAWizard.tsx`, `ProfilePicker.tsx`, `NoteSelector.tsx`, `BCurveEditor.tsx`, `TuningSimPanel.tsx`, `TuningSimGameBar.tsx`, `TuningSimResultsPanel.tsx`, `PTASetupStep.tsx`, `PTABridgeBreakStep.tsx`, `PTAMeasureStep.tsx`, `PTAResultsStep.tsx`.
- Ran static audits:
  - Impeccable detection (`node ~/.agents/skills/impeccable/scripts/detect.mjs --json src`): 0 findings.
  - Unslop UI scan (`python3 ~/.agents/skills/unslop-ui/scripts/devibe_scan.py . --json`): Score 2/100 (only intentional target-key pulse).
- REQ-UI-006 verified: `Impl ✅ | Test ✅`.
- Full quality gate pass: `bun run lint` (0 errors), `bun run test` (158 tests passing), `bun run build` (successful production build).


