# UI hardening requirements

Status notation: `Impl` is implementation evidence and `Test` is automated verification evidence.

REQ-UI-001 | quality | keyboard interaction | Every playable piano key is reachable, named, and playable with a keyboard without requiring a pointer. | Given keyboard focus is on a piano key, when Enter or Space is pressed and released, then that named note starts and stops exactly as it does for pointer input. | Impl ✅ | Test ⚠️ (component coverage pending)

REQ-UI-002 | quality | adjustment controls | The keyboard minimap and cents adjustment control expose an accessible, keyboard-operable equivalent of their pointer interactions. | Given a keyboard-only user, when they navigate to either control, then its purpose and current value are exposed and its supported adjustment action can be performed. | Impl ✅ | Test ⚠️ (component coverage pending)

REQ-UI-003 | quality | dialogs | Every overlay sheet behaves as a modal dialog. | Given a sheet opens, when focus moves, then it remains within the sheet; when Escape or its labelled close control is activated, then it closes and focus returns to its opener. | Impl ✅ | Test ⚠️ (component coverage pending)

REQ-UI-004 | quality | responsive layout | The interactive controls remain reachable without unintended horizontal clipping at 320px viewport width and 320px viewport height. | Given either constrained viewport, when the application is used, then control groups wrap, stack, or scroll with a visible affordance and no task control is hidden. | Impl ✅ | Test ⚠️ (manual 390px screenshot verified; 320px device UAT pending)

REQ-UI-005 | quality | focus and motion | Interaction state remains clear for keyboard and motion-sensitive users. | Given keyboard navigation, when a control gains focus, then a visible focus indicator appears; given reduced motion, when a target key is shown, then its target state remains visible without infinite pulsing. | Impl ✅ | Test ⚠️ (manual/browser UAT pending)

REQ-UI-006 | quality | visual tokens | Shared status, overlay, and key colors are defined once as semantic CSS custom properties. | Given a shared semantic color changes, when the UI renders, then all usages of that semantic role update through its token. | Impl ⚠️ (foundation added; broader migration deferred) | Test ⚠️ (static audit pending)

REQ-UI-007 | behavior | advertising | The application does not render or initialize advertising. | Given the app loads or re-renders, when the normal UI is displayed, then no advertisement element is mounted and no `adsbygoogle` push is executed. | Impl ✅ | Test ✅ (source/build inspection)

REQ-UI-008 | behavior | sustain | Infinite Sustain applies to ordinary piano keys as well as dedicated tone controls. | Given Infinite Sustain is enabled, when a user releases a normal piano key, then its tone remains active until the user explicitly stops it or disables the mode. | Impl ✅ | Test ✅ (`VirtualKeyboard.layout.test.tsx`)

REQ-UI-009 | quality | cents jog wheel | The cents adjustment surface behaves and reads as a rotary jog wheel. | Given a selected note, when the user turns or drags the wheel clockwise or counter-clockwise, then its value moves sharper or flatter respectively within -100¢ to +100¢; the exact value is visible outside Tuning Practice and remains unavailable in Tuning Practice. | Impl ✅ | Test ⚠️ (desktop and 390px visual verification; component coverage pending)

## Behavior scenarios

SCN-UI-001 | REQ-UI-001, REQ-UI-002 | Given a keyboard-only user, when they navigate the piano and adjustment controls, then they can select and alter a note with named, operable controls. | component | planned component tests

SCN-UI-002 | REQ-UI-003 | Given a user opens Help or Calibration Test, when they press Escape, then the sheet closes and focus returns to the launching control. | component | planned component tests

SCN-UI-003 | REQ-UI-004, REQ-UI-005 | Given a constrained or motion-reduced environment, when the app renders, then controls remain reachable and state remains perceptible. | component/static | planned CSS and component tests

SCN-UI-004 | REQ-UI-007 | Given the application renders, when its DOM is inspected, then no advertising element or initialization is present. | component | planned App test

SCN-UI-005 | REQ-UI-008 | Given Infinite Sustain is enabled, when a user plays and releases a normal piano key, then the tone stays active until explicitly stopped. | component | planned VirtualKeyboard test

SCN-UI-006 | REQ-UI-002, REQ-UI-005, REQ-UI-009 | Given a selected note, when a user operates the cents wheel by pointer, touch, or keyboard, then the value changes in the intended direction and the game mode retains no numerical feedback. | component | planned CentsJogWheel test

## Verification record

- 2026-09-06: `bun run lint` passed with no warnings; `bun run test` passed (131 tests); `bun run build` passed.
- 2026-09-06: Visual screenshots verified the redesigned jog wheel at desktop and 390px mobile widths with no overlap or clipping.
- 2026-09-06: Impeccable detector reported no findings. `unslop-ui` remains 2/100 for the intentional target-key pulse; retain it because it communicates the active tuning target.
