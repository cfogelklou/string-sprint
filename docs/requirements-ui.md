# UI hardening requirements

Status notation: `Impl` is implementation evidence and `Test` is automated verification evidence.

REQ-UI-001 | quality | keyboard interaction | Every playable piano key is reachable, named, and playable with a keyboard without requiring a pointer. | Given keyboard focus is on a piano key, when Enter or Space is pressed and released, then that named note starts and stops exactly as it does for pointer input. | Impl ✅ | Test ✅ (VirtualKeyboard.a11y.test.tsx)

REQ-UI-002 | quality | adjustment controls | The keyboard minimap and cents adjustment control expose an accessible, keyboard-operable equivalent of their pointer interactions. | Given a keyboard-only user, when they navigate to either control, then its purpose and current value are exposed and its supported adjustment action can be performed. | Impl ✅ | Test ✅ (KeyboardMinimap.a11y.test.tsx, CentsJogWheel.a11y.test.tsx)

REQ-UI-003 | quality | dialogs | Every overlay sheet behaves as a modal dialog. | Given a sheet opens, when focus moves, then it remains within the sheet; when Escape or its labelled close control is activated, then it closes and focus returns to its opener. | Impl ✅ | Test ✅ (Dialogs.a11y.test.tsx)

REQ-UI-004 | quality | responsive layout | The interactive controls remain reachable without unintended horizontal clipping at 320px viewport width and 320px viewport height. | Given either constrained viewport, when the application is used, then control groups wrap, stack, or scroll with a visible affordance and no task control is hidden. | Impl ✅ | Test ✅ (responsive.test.ts, CSS responsive breakpoints)

REQ-UI-005 | quality | focus and motion | Interaction state remains clear for keyboard and motion-sensitive users. | Given keyboard navigation, when a control gains focus, then a visible focus indicator appears; given reduced motion, when a target key is shown, then its target state remains visible without infinite pulsing. | Impl ✅ | Test ✅ (responsive.test.ts, CSS prefers-reduced-motion)

REQ-UI-006 | quality | visual tokens | Shared status, overlay, and key colors are defined once as semantic CSS custom properties. | Given a shared semantic color changes, when the UI renders, then all usages of that semantic role update through its token. | Impl ✅ | Test ✅ (static audit, impeccable & unslop scans)

REQ-UI-007 | behavior | advertising | The application does not render or initialize advertising. | Given the app loads or re-renders, when the normal UI is displayed, then no advertisement element is mounted and no `adsbygoogle` push is executed. | Impl ✅ | Test ✅ (App.noAds.test.tsx)

REQ-UI-008 | behavior | sustain | Infinite Sustain applies to ordinary piano keys as well as dedicated tone controls. | Given Infinite Sustain is enabled, when a user releases a normal piano key, then its tone remains active until the user explicitly stops it or disables the mode. | Impl ✅ | Test ✅ (VirtualKeyboard.layout.test.tsx, pianoStore.test.ts, audioSync.test.ts)

REQ-UI-010 | quality | zero-shift tuner layout | The tuner deck and cents adjustment structure are always rendered and mounted across initial load and key selection changes without height collapse or layout jump. | Given initial load before key selection, when the application renders, then the full deck structure (Note card, dial, and step buttons) is visible; selecting a note updates values without shifting downstream elements. | Impl ✅ | Test ✅ (CentsJogWheel.a11y.test.tsx)

REQ-UI-011 | quality | horizontal tuner deck | The top tuning interface presents a balanced horizontal 3-column deck (vertical note acoustics card left, rotary jog wheel dial center, vertical step matrix right). | Given the tuner renders, when inspected, then Note/Octave/Freq/B/Partials are stacked on the left, the wheel dial and reset button are centered, and fine step buttons are stacked on the right. | Impl ✅ | Test ✅ (CentsJogWheel.a11y.test.tsx, NoteSelector.suba0.test.tsx)

REQ-UI-012 | behavior | brag mode precision | Cents adjustment and display support ±0.01¢ step buttons and hundredths precision. | Given a selected note, when +0.01¢ or −0.01¢ is activated, then cents offset is adjusted by ±0.01 and the readout displays two-decimal precision. | Impl ✅ | Test ✅ (CentsJogWheel.a11y.test.tsx)

## Behavior scenarios

SCN-UI-001 | REQ-UI-001, REQ-UI-002 | Given a keyboard-only user, when they navigate the piano and adjustment controls, then they can select and alter a note with named, operable controls. | component | VirtualKeyboard.a11y.test.tsx, KeyboardMinimap.a11y.test.tsx, CentsJogWheel.a11y.test.tsx

SCN-UI-002 | REQ-UI-003 | Given a user opens Help or Calibration Test, when they press Escape, then the sheet closes and focus returns to the launching control. | component | Dialogs.a11y.test.tsx

SCN-UI-003 | REQ-UI-004, REQ-UI-005 | Given a constrained or motion-reduced environment, when the app renders, then controls remain reachable and state remains perceptible. | component/static | responsive.test.ts, CSS verification

SCN-UI-004 | REQ-UI-007 | Given the application renders, when its DOM is inspected, then no advertising element or initialization is present. | component | App.noAds.test.tsx

SCN-UI-005 | REQ-UI-008 | Given Infinite Sustain is enabled, when a user plays and releases a normal piano key, then the tone stays active until explicitly stopped. | component | VirtualKeyboard.layout.test.tsx, pianoStore.test.ts, audioSync.test.ts

SCN-UI-006 | REQ-UI-002, REQ-UI-005, REQ-UI-009, REQ-UI-010, REQ-UI-011, REQ-UI-012 | Given a selected note, when a user operates the cents wheel by pointer, touch, or keyboard, then the value changes in the intended direction, ±0.01¢ brag steps function, the horizontal deck stays rock-solid with zero layout jump, and the game mode retains no numerical feedback. | component | CentsJogWheel.a11y.test.tsx

## Verification record

- 2026-09-06: `bun run lint` passed with no warnings; `bun run test` passed (158 tests across 19 test files); `bun run build` passed.
- 2026-09-06: Visual screenshots verified the redesigned jog wheel at desktop and 390px mobile widths with no overlap or clipping.
- 2026-09-06: Responsive and motion test suite `src/responsive.test.ts` passed for max-width 360px, max-height 520px, and `prefers-reduced-motion: reduce`.
- 2026-09-06: Impeccable detector reported 0 findings. `unslop-ui` scored 2/100 for the intentional target-key pulse; retained because it communicates the active tuning target.
- 2026-09-07: Implemented horizontal tuner deck, always-mounted zero-shift wheel structure, and ±0.01¢ brag mode buttons. Full linting (0 errors), vitest suite (160/160 passing), and production build passed.
