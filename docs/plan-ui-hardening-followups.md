# UI hardening follow-up plan

## Purpose

Close the evidence and behavior gaps left by `6ec22b5` without changing the approved instrument-control visual direction. The existing requirements live in `docs/requirements-ui.md`; update their implementation and test statuses only when their linked evidence passes.

## Guardrails

- Preserve the dark strobe-instrument visual system and the intentional target-key pulse.
- Keep the rotary jog wheel and all six precision buttons (`±0.1¢`, `±1¢`, `±5¢`).
- Do not restore ads. Keep `AdBanner.tsx` untouched unless a separate decision permanently removes it.
- Use Bun gates: `bun run lint`, `bun run test`, and `bun run build`.
- Follow `CLAUDE.md` and `docs/typescript-guidelines.md`; avoid new dependencies.

## Milestone 1 — Complete Infinite Sustain semantics

**Owner surface:** `src/store/pianoStore.ts`, `src/App.tsx`, `src/components/VirtualKeyboard.tsx`, and focused tests.

### Problem

Normal-key release now respects Infinite Sustain, but changing the checkbox from enabled to disabled does not stop tones that were already started with the infinite envelope. This leaves REQ-UI-008 partially implemented.

### Acceptance criteria

- Given Infinite Sustain is enabled, releasing a normal key keeps its tone active.
- Given an infinitely sustained tone is active, disabling Infinite Sustain stops it cleanly and removes it from both store and audio-engine state.
- Dedicated controls retain their existing intentional behavior, including Crazy Strobe Test’s explicit sustain configuration.

### Evidence

- Extend `VirtualKeyboard.layout.test.tsx` for release and mode-disable behavior.
- Add an integration-level test at the store/audio synchronization seam if a component test cannot prove the engine stops.
- Mark REQ-UI-008 `Impl ✅ | Test ✅` only after the real synchronization path is covered.

## Milestone 2 — Add component-level accessibility and interaction evidence

**Owner surface:** new focused tests adjacent to `VirtualKeyboard`, `KeyboardMinimap`, `CentsJogWheel`, `HelpSheet`, and `PTAWizard`.

### Test slices

1. **Virtual keyboard:** one roving Tab stop; Arrow/Home/End navigation; Space/Enter note activation; accessible name and pressed state.
2. **Minimap:** slider role, min/max/current value, pointer selection, and Arrow/Home/End changes.
3. **Cents jog wheel:** normal mode exposes slider value; keyboard increments and bounds; Tuning Practice omits the numeric accessible value while retaining operable controls; precision buttons remain available.
4. **Dialogs:** Help and PTA open with focus inside, trap Tab, close with Escape and labelled close buttons, and restore focus to the opener. Add B Curve and Results coverage only if their shared hook behavior is not adequately exercised through those first two surfaces.
5. **Ads:** render `App` and assert no ad element, AdSense script, or `adsbygoogle` initialization is present.

### Acceptance criteria

- SCN-UI-001 through SCN-UI-006 are backed by executable RTL/Vitest tests where practical.
- REQ-UI-001, 002, 003, 007, and 009 advance to `Test ✅` only with direct evidence.

## Milestone 3 — Responsive and reduced-motion UAT

**Owner surface:** `src/index.css` and manual browser validation; only change CSS if UAT exposes a failure.

### Test matrix

| Viewport / preference | Validate |
| --- | --- |
| 320×320 | Every essential control remains reachable; bassline controls wrap or retain a deliberate scroll affordance; no clipped modal navigation. |
| 320×568 | Jog wheel, precision buttons, controls bar, keyboard, and bassline buttons fit without accidental overlap. |
| 390×844 | Preserve the already-approved mobile composition. |
| Desktop | Keyboard remains usable and the new jog wheel does not obscure primary work. |
| `prefers-reduced-motion: reduce` | Target key has a static, visible target treatment; sheet and control state changes remain understandable. |

### Acceptance criteria

- Capture current screenshots or a concise UAT record for each matrix row.
- Resolve any clipping or inaccessible control before marking REQ-UI-004 and REQ-UI-005 complete.

## Milestone 4 — Finish semantic-token migration

**Owner surface:** `src/index.css` and the affected components.

### Scope

- Inventory repeated hex/RGBA values.
- Promote only repeated semantic roles: success, warning, error, overlay, control surface/border, key states, and chart colours where their meaning is shared.
- Migrate usages to existing or newly named CSS custom properties.
- Leave one-off canvas/data visual values local unless they represent a repeated UI semantic.

### Acceptance criteria

- `rg` shows no duplicate hard-coded shared status/overlay/control colours in component styles.
- Contrast remains at least WCAG AA for normal text.
- Re-run `python3 /Users/chris/.agents/skills/unslop-ui/scripts/devibe_scan.py . --json` and `node /Users/chris/.agents/skills/impeccable/scripts/detect.mjs --json src`.
- Mark REQ-UI-006 complete only after this migration and static review.

## Close-out

1. Run all three Bun gates.
2. Re-run the Impeccable audit and unslop scanner; document intentional findings rather than suppressing them blindly.
3. Update `docs/requirements-ui.md` and `docs/vibe-model/milestone-notes-ui-hardening.md` with actual evidence.
4. Keep `TD-UI-001` and `TD-UI-002` open unless product direction changes.
