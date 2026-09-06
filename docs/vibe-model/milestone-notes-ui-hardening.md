# UI hardening — milestone notes

## Epic plan

- [x] Milestone 1: Accessible and responsive control surfaces; disable advertising.
- [x] Milestone 2: Verify against requirements and re-run the UI audit.

## Milestone 1 scope

- Replace pointer-only interaction surfaces with accessible equivalents.
- Introduce a shared modal-dialog behavior for sheets.
- Add focus, reduced-motion, constrained-viewport, and semantic-token foundations.
- Replace the horizontal cents strip with an accessible rotary jog wheel while retaining precision nudge buttons.
- Make Infinite Sustain apply to normal piano-key releases as well as dedicated tone controls.
- Remove `AdBanner` from the application tree without deleting ad code.

## Decisions

- Issue tracker: local Markdown under `.scratch/`.
- Triage labels: standard canonical labels.
- Domain docs: no required context or ADR structure.
- Advertising: disabled in product UI; implementation retained as technical debt TD-UI-001.

## Verification record

- `bun run lint`: passed with no warnings.
- `bun run test`: passed, 131 tests.
- `bun run build`: passed.
- Desktop and 390px mobile jog-wheel screenshots reviewed; no blocking visual defects.
- Impeccable detector: no findings. `unslop-ui`: 2/100 for intentional target-key feedback only.
