# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fake Piano is a **Progressive Web App (PWA)** that simulates piano tuning. Users can:
- Play a virtual piano with realistic audio synthesis
- Practice tuning skills through a "Tuning Simulation" game mode
- Explore and adjust B-curve coefficients for different piano profiles
- Fine-tune individual notes with cent-level precision

## Technology Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6.x
- **Package Manager**: Bun
- **State Management**: Zustand
- **Audio**: Web Audio API with custom synthesis engine
- **Testing**: Vitest + Playwright

## Development Commands

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Run linting
bun run lint

# Run tests
bun run test

# Preview production build
bun run preview
```

## Project Structure

```
src/
├── types/              # Shared TypeScript types and constants
├── audio/              # Audio synthesis engine
├── store/              # Zustand state management
├── hooks/              # Custom React hooks
├── components/         # React components
├── model/              # Piano note calculations and data
├── tuning/             # Stretch calculations and tuning logic
├── bCoefficients/      # Piano profiles and B-coefficient data
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

## TypeScript Guidelines

**CRITICAL**: See [docs/typescript-guidelines.md](docs/typescript-guidelines.md) for comprehensive TypeScript best practices.

Key principles:
- No magic strings or numbers — use centralized constants and enums
- Always use the `@/*` path alias (never relative paths like `../../types`)
- Avoid `any` — use proper types or `unknown`
- Type all external data (user input, API responses)
- Use type guards and type narrowing instead of assertions

## Audio Engine

The audio engine uses Web Audio API with custom synthesis:
- **Partial-based synthesis**: Each note uses multiple harmonic partials
- **B-coefficient stretching**: Piano-specific stretch curves via B-coefficients
- **ADSR envelopes**: Attack/decay/sustain/release for realistic sound
- **Multi-note polyphony**: Up to 4 simultaneous tones

See `src/audio/audioEngine.ts` for implementation.

## State Management (Zustand)

Store location: `src/store/pianoStore.ts`

Key state:
- `activeTones`: Map of currently playing notes
- `masterVolume`: Global volume (0–1)
- `activeProfile`: Selected piano profile (e.g., "Concert Grand")
- `isBCurveEditorOpen`: UI state for B-curve editor overlay
- `tuningSimPhase`: Tuning game phase ('idle' | 'playing' | 'revealed')

## Tuning Simulation Game

The "Tuning Simulation" is a gamified learning tool:
1. **Target notes**: Randomly selected notes across the keyboard
2. **Stretch calculation**: Railsback curve or partial-matching strategies
3. **User input**: Adjust cents via jog wheel or keyboard
4. **Scoring**: Graded based on accuracy (A+ to F)

See `src/hooks/useTuningSimulation.ts` for game logic.

## CSS Variables (Design System)

All colors and spacing use CSS variables defined in `src/index.css`:

**Colors:**
- `--color-bg`: Background (#121212)
- `--color-surface`: Surface/panels (#1e1e1e)
- `--color-primary`: Primary action (#0d47a1)
- `--color-accent`: Accents/highlights (#00e676)
- `--color-text`: Primary text (#e0e0e0)
- `--color-text-dim`: Dimmed text (#999999)
- `--color-destructive`: Destructive actions (#d32f2f)

**Spacing:** Multiples of 4px (4, 8, 12, 16, 20, 24)

**Typography:** System font stack

## Layout Architecture

The app uses CSS Grid layout (`#fakepiano-app`):
- Status area (note selector)
- Cents jog wheel area
- Controls bar (title, profile picker, volume, action buttons)
- Tuning sim area (hidden unless game active)
- Keyboard minimap
- Virtual keyboard (scrollable)

Responsive breakpoints:
- Mobile portrait: < 480px
- Mobile landscape: 480–959px
- Desktop: 960px+

See `src/index.css` for full layout details.

## Pre-existing errors

There is no such thing as "pre-existing" errors. All errors must be considered "yours to fix." Take ownership!

## Git Workflow

- **Main branch**: `main`
- **Current branch**: Check before committing
- **Conventional commits**: Use clear commit messages (e.g., "feat:", "fix:", "refactor:")
