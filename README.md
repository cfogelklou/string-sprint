# 🎹 Fake Piano

**Inharmonic tone generator for testing strobe tuners.**

Live at [applicaudia.se/fakepiano](https://applicaudia.se/fakepiano)

Fake Piano synthesizes piano tones with mathematically precise inharmonicity using the Web Audio API. It produces tones through one device's speakers while a strobe tuner app (like [Strobopro](https://applicaudia.se/strobopro)) listens on a different device's microphone — enabling deterministic, repeatable strobe pattern testing that real pianos can't provide.

## How It Works

Piano strings are stiff, which stretches their harmonics sharp. The *inharmonicity coefficient* B controls how much. Fake Piano uses the same formula as Strobopro:

```
fₙ = n × f₁ × √((1 + B·n²) / (1 + B))
```

Cents offsets are applied **after** the B-stretch (matching Strobopro's behavior), so the tuner reads exactly what you set.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) runtime
- Node.js 20+ (for Vite 7)

### Install & Run

```bash
cd fakepiano
bun install
bun run dev
```

Open the dev server URL on your phone or computer.

### Build

```bash
bun run build
```

### Test

```bash
bun run test
```

## Using with Strobopro

1. Open Fake Piano on **Device A** (the tone generator).
2. Open Strobopro on **Device B** (the tuner).
3. Place Device B's microphone near Device A's speaker.
4. On Fake Piano, select the same B profile in both apps (e.g., "Upright").
5. Tap a key — Strobopro should read 0.0 cents when the cents offset is 0.
6. Adjust cents with the jog wheel — Strobopro should read the matching offset.

## Interface Guide

### Start Screen

When you first open the app, you see a **START AUDIO** button. Browsers require a user gesture before playing audio. Tap it once to initialize the audio engine.

### Header Bar

| Element | Description |
|---------|-------------|
| **Profile Picker** (dropdown) | Select one of 6 piano B-coefficient profiles. Both devices should use the same profile for accurate testing. |
| **Volume slider** | Master output volume (0–100%). |

### Note Info Panel

Displays details for the selected key:

| Field | Description |
|-------|-------------|
| **Note name** | e.g., `A4`, `C#3` (large, top-left) |
| **Frequency** | Fundamental frequency in Hz |
| **B value** | Inharmonicity coefficient for this note in the current profile |
| **Partials slider** | Number of harmonics per tone (1–10). More partials = richer tone, more CPU. |
| **Volume slider** | Duplicate of header volume for quick access. |

### Cents Jog Wheel

A horizontal drag area for fine-tuning the selected note's cents offset (−100 to +100, 0.1¢ precision).

- **Drag left/right** — adjust cents. Faster swipe = more change.
- **Release with momentum** — inertial scrolling decays with friction.
- **Haptic feedback** — a short vibration each time a whole-cent boundary is crossed (on supported devices).
- **Reset button** (right side) — snaps back to 0.0¢.
- Display turns **blue** when within ±0.1¢ (effectively in tune).

> **"Select a key to tune"** appears when no key is selected.

### Controls Bar

| Button | Description |
|--------|-------------|
| **Reset Tuning** | Sets all 88 keys' cents offsets back to 0. |
| **B Curve** | Opens the B Curve Editor bottom sheet. |

### Tuning Simulation Panel

The game mode — simulates the process of tuning a real piano.

| Button | Description |
|--------|-------------|
| **Tuning Sim** | Enables simulation mode. All 88 keys get randomized cents offsets (±50¢). Button turns red and relabels to "Stop Sim". |
| **Stop Sim** | Disables simulation, resets all offsets to 0. |
| **Randomize** | Re-randomizes all offsets (only visible in sim mode). |
| **Reset** | Sets all offsets to 0 without exiting sim mode (only visible in sim mode). |
| **X/88 tuned** | Progress counter. A key counts as "tuned" when its cents offset is within ±0.5¢. Turns blue when all 88 are tuned. |

#### How to Play the Tuning Simulation

1. Tap **Tuning Sim** — all notes get random detuning.
2. On a second device running Strobopro, hold a note on Fake Piano.
3. Strobopro shows the cents error for that note.
4. Use the **Cents Jog Wheel** to bring the offset to 0.0¢ — Strobopro's strobe pattern will slow and stop.
5. Release the key, move to the next note, repeat.
6. Goal: tune all 88 notes. Progress counter tracks how many are within ±0.5¢.

### Keyboard Minimap

A thin navigation strip above the keyboard. Tap any position to jump the keyboard scroll to that region. Shows active (blue) and selected (bright blue) keys.

### Virtual Keyboard

A scrollable 88-key piano (A0–C8). All **A** keys are labeled (A0, A1, ... A7) as octave reference markers.

- **Tap a key** — plays that note. Up to 4 simultaneous tones.
- **Release** — note stops with a short fade-out to prevent clicks.
- **Active keys** highlighted blue.
- **Selected key** has a blue border and drives the Note Info Panel and Cents Jog Wheel.
- Scroll horizontally to navigate the full range. On mobile, swipe through the keyboard.

### B Curve Editor

A bottom sheet (slide-up drawer) showing the inharmonicity curve across all 88 keys.

- **Canvas chart** — log-scale B values from A0 to C8.
- **Profile selector** — switch between the 6 preset profiles.
- **Custom mode** — toggle to "Custom" to edit Rigaud model parameters directly:
  - `s_B` — body exponent
  - `y_B` — body offset
  - `s_T` — treble exponent (fixed at 0.0926 by convention)
  - `y_T` — treble offset
- **Swipe down** or tap backdrop to dismiss.

## B Profiles

Six preset inharmonicity profiles copied from Strobopro, measured from real pianos:

| Profile | Description |
|---------|-------------|
| Concert Grand | Lowest inharmonicity. Large soundboard, long strings. |
| Studio Grand | Slightly higher B than concert grand. |
| Baby Grand | Shorter strings → more stretch in the treble. |
| Upright | Default. Typical vertical piano characteristics. |
| Console | Compact upright, higher B across the range. |
| Spinet | Highest inharmonicity. Shortest strings. |

## Technical Details

- **Synthesis**: Additive sinusoidal — each partial is a separate `OscillatorNode`, amplitude decays as `1/n^1.2`.
- **Max simultaneous tones**: 4 (configurable via `AUDIO_CONFIG`).
- **Max partials per tone**: 10.
- **Anti-click**: Gain ramps (5ms attack, 50ms release) on every tone start/stop.
- **Cents order**: Cents applied after B-stretch — `partialFreq(f1, B, n) * centsToFreqRatio(cents)`.
- **Rigaud model**: `B(m) = exp(s_B·m + y_B) + exp(s_T·m + y_T)` for custom curves.
- **State**: Zustand store with per-note cents offsets preserved across profile switches.

## License

Private project. All rights reserved.
