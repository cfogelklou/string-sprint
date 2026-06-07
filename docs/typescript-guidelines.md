# TypeScript & Code Quality Guidelines

This document outlines coding standards and best practices for the Fake Piano codebase (React PWA).

## 1. The "No Magic Strings/Numbers" Rule

**Principle:** Do not scatter string literals or magic numbers throughout the codebase. "Random strings" make refactoring difficult and prone to typos.

**Bad Practice: Using for state or phase**
```typescript
//  BAD: Magic strings
if (tuningSimPhase === 'playing') { ... }

//  BAD: Magic number
if (frequency > 440) { ... }  // What is 440? A4?

//  BAD: Hardcoded color
backgroundColor: '#FF0000'
```

**Good Practice:**
```typescript
//  GOOD: Type-annotated variable + string literal
import type { TuningSimPhase } from '@/types';
const phase: TuningSimPhase = 'playing';
if (phase === 'playing') { ... }

//  GOOD: Named Constant
import { DEFAULT_A4 } from '@/types';
if (frequency > DEFAULT_A4) { ... }

//  GOOD: CSS Variable for color
backgroundColor: 'var(--color-destructive)'
```

Note: Don't mix up "strings for printing" like messages to users or developers (OK!), with strings for states or object keys (BAD!)

### 1a. Exception: Magic Numbers in Styles

**Principle:** The "no magic numbers" rule applies primarily to **business logic, audio state, and semantic constants**. For styling (CSS/inline styles), magic numbers are **acceptable** when a standardized design system constant doesn't exist.

**When to Use CSS Variables (REQUIRED):**

If a CSS variable exists, you MUST use it instead of a literal value:

```typescript
// GOOD: Use existing CSS variables
const style = {
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text)',
  padding: '6px 12px',
};

// GOOD: Use spacing from design system (multiples of 4px)
gap: 8,        // 2x spacing
padding: 12,   // 3x spacing
margin: 16,    // 4x spacing
```

**Available CSS Variables:**
- **Colors**: `--color-bg`, `--color-surface`, `--color-primary`, `--color-accent`, `--color-text`, `--color-text-dim`, `--color-destructive`
- **Spacing**: Multiples of 4px (4, 8, 12, 16, 20, 24)
- **Typography**: Font sizes inherit from scale

**When Magic Numbers Are OK:**

For style properties **without** CSS variables, literal values are acceptable:

```typescript
// OK: Component-specific sizes (no standard constants exist)
width: 280,
height: 120,
borderRadius: 6,

// OK: Animation timing values
transitionDuration: 150,

// OK: Component-specific layout
minHeight: 80,
```

**When to Extract to Constants:**

Only extract style values to constants if:

1. **Reused multiple times in the same file**
   ```typescript
   // GOOD: Used in 3+ places in this file
   const KEYBOARD_HEIGHT = 120;
   const styles = {
     keyboard: { height: KEYBOARD_HEIGHT },
     overlay: { height: KEYBOARD_HEIGHT },
   };
   ```

2. **Represents a semantic concept**
   ```typescript
   // GOOD: Semantic meaning
   const MAX_CENTS = 50;
   const MIN_CENTS = -50;
   ```

**Summary:**
- **Business logic & audio state**: NO magic strings/numbers - always use constants/enums
- **Styles with CSS variables**: Use CSS variables from `index.css`
- **Styles without CSS variables**: Literal numbers are OK
- **Extract to constants**: Only if reused multiple times in same file OR has semantic meaning

## 2. Centralized Definitions

Think of our type system like a single source of truth. Define standard values **in one place** and refer to them everywhere.

### DRY Principle for Types

**Critical:** Never duplicate type definitions. Types should have a **single source of truth**.

**Bad Practice - DRY Violation:**
```typescript
// In component file
interface PianoKey {
  midi: number;
  freq: number;
  isBlack: boolean;
}

// In another file — duplicated!
interface PianoKey {
  midiNote: number;
  frequency: number;
  blackKey: boolean;
}
```

**Good Practice - Single Source of Truth:**
```typescript
// In src/types/index.ts — single definition
export interface PianoKey {
  midiNote: number;
  name: string;
  isBlack: boolean;
  fundamentalFreq: number;
  B: number;
  centsOffset: number;
}

// Import and reuse everywhere
import type { PianoKey } from '@/types';
```

### Locations for Definitions

*   **Universal Types & Enums:** Place in **`src/types/`**.
    *   **Usage:** MIDI constants, breakpoints, piano types, audio config, tuning simulation types.
    *   **Examples:** `PianoKey`, `ToneConfig`, `TuningSimPhase`, `PIANO_PROFILE_NAMES`.

*   **Component-Specific Types:** Place in **same file as component** or co-located.
    *   **Usage:** Props interfaces specific to a single component.
    *   **Example:** Component props, event handlers.

*   **Store Types:** Place in **`src/store/`**.
    *   **Usage:** Zustand store interfaces and state types.

### Base Types, Derived Types

Don't put all information for all potential usages inside one type. Instead, put all common information in base type. If you need specific data, put it in a derived type.

```typescript
// BAD: Using any type assertion
const pianoTone = (state as any).tone;
if (pianoTone.frequency) { ... }

// GOOD: Use specific type
const toneConfig: ToneConfig = {
  frequency: 440,
  B: 1.0,
  centsOffset: 0,
  numPartials: 10,
  sustainDuration: 2.0,
};
```

## 3. Path Aliases

Always use the configured path alias. Never use deep relative paths (e.g., `../../../components`).

*   **`@/*`**: For all app code.
    *   Maps to: `src/*`
    *   **Examples:**
      - `@/types` → `src/types/index.ts`
      - `@/components/VirtualKeyboard` → `src/components/VirtualKeyboard.tsx`
      - `@/store/pianoStore` → `src/store/pianoStore.ts`
      - `@/audio/audioEngine` → `src/audio/audioEngine.ts`

### Examples

```typescript
// GOOD: Using path alias
import { PianoKey } from '@/types';
import { usePianoStore } from '@/store/pianoStore';
import VirtualKeyboard from '@/components/VirtualKeyboard';

// BAD: Deep relative paths
import { PianoKey } from '../../../types';
```

## 4. Type Safety & Imports

*   **No Inline Imports**: Do NOT use inline `import()` statements within type definitions. Always use standard top-level `import` statements.

**Bad Practice:**
```typescript
// BAD: Inline import
tones?: Map<number, import('@/types').ToneConfig>;
```

**Good Practice:**
```typescript
// GOOD: Standard top-level import
import type { ToneConfig } from '@/types';

tones?: Map<number, ToneConfig>;
```

*   **No `any`**: Avoid `any` unless absolutely necessary (e.g., at platform boundaries). Use `unknown` or specific types.
*   **Strict Null Checks**: Handle `null` and `undefined` explicitly.
*   **No Type Assertions in Logic**: Prefer type guards and type narrowing over `as Type` assertions.

## 5. Typing External Data Sources

**Principle:** External data (APIs, user input) is untyped by default. Always apply explicit types to prevent runtime errors.

### User Input

**Bad Practice:**
```typescript
// BAD: Untyped user input
const freq = parseFloat(inputValue);
playTone(freq);  // Could be NaN or invalid
```

**Good Practice:**
```typescript
// GOOD: Validate and type user input
const freq = parseFloat(inputValue);
if (isNaN(freq) || freq < 20 || freq > 20000) {
  throw new Error('Invalid frequency');
}
playTone(freq);
```

## 6. Default Constants for Complex Types

**Principle:** For types with many fields (especially interfaces with 5+ properties), always provide a `DEFAULT_<TYPENAME>` constant. This makes creating new instances trivial and prevents initialization errors from missing fields.

**Pattern:**
```typescript
// Define the interface
export interface ToneConfig {
  frequency: number;
  B: number;
  centsOffset: number;
  numPartials: number;
  sustainDuration: number;
}

// Provide a default constant
export const DEFAULT_TONE_CONFIG: ToneConfig = {
  frequency: 440,
  B: 1.0,
  centsOffset: 0,
  numPartials: 10,
  sustainDuration: 2.0,
};

// Usage: Easy initialization
const myTone: ToneConfig = {
  ...DEFAULT_TONE_CONFIG,
  frequency: 880,  // Override only what you need
};
```

**Bad Practice:**
```typescript
// BAD: Manual initialization prone to missing fields
const tone: ToneConfig = {
  frequency: 440,
  B: 1.0,
  centsOffset: 0,
  numPartials: 10,
  sustainDuration: 2.0,
};
```

**Rules:**
- Name the constant `DEFAULT_<TYPENAME>` (e.g., `DEFAULT_TONE_CONFIG`).
- Initialize all fields to sensible defaults.
- Place the constant immediately after the type definition.
- Use this pattern for any interface with more than 5 fields.

## 7. Control Flow: Switch vs. If/Else

**Principle:** Prefer `switch` statements over complex `if/else` chains, especially for variables that represent a set of modes or types (e.g., `TuningSimPhase`, `PianoProfileName`).

**Why this matters:**
- **Exhaustiveness:** You can use a `default` case to handle unexpected values.
- **Maintainability:** As more types are added, a `switch` statement is easier to audit.
- **Clarity:** `switch` statements clearly signal branching based on a single variable.

**Bad Practice:**
```typescript
if (phase === 'idle') {
  // logic
} else if (phase === 'playing') {
  // logic
}
// If a new phase is added, this code silently fails.
```

**Good Practice:**
```typescript
switch (phase) {
  case 'idle':
    // logic
    break;
  case 'playing':
    // logic
    break;
  case 'revealed':
    // logic
    break;
  default:
    // GOOD: Always handle the default case
    console.error(`Unhandled phase: ${phase}`);
}
```

## 8. Null/Undefined Checks: Using `const` to Satisfy Linters

**Principle:** When a linter warns that a variable might be `null` or `undefined` even after a guard clause, extract it to a `const` to reset the type narrowing context.

### The Solution: Extract to `const`

When you've validated a variable exists, extract it to a `const`. This resets TypeScript's type narrowing and satisfies linters.

**GOOD: Extract to const, THEN check for null**
```typescript
// Step 1: Extract to const (still typed as ToneConfig | null)
const validConfig = toneConfig;

// Step 2: Check for null - NOW TypeScript narrows type
if (!validConfig) {
  return;
}

// Step 3: Use the extracted const - TypeScript knows it's ToneConfig
playTone(validConfig.frequency, validConfig.B);
```

### When to Use This Pattern

- **Guard clauses**: Extract to `const` FIRST, then immediately check for `null`/`undefined`.
- **Parameter validation**: Extract parameter to `const`, then check it.
- **Before long code blocks**: If you have multiple statements using the same variable, extract once at the top and check immediately.

## 9. Type Narrowing with Guards and Derived Variables

**Principle:** When a variable can have multiple types (union types), use type guards to check the actual type, then create a new variable with that specific type for all further operations.

### The Pattern

1. **Check the type** using a type guard function or runtime check
2. **Create a new variable** with the narrowed type (type assertion)
3. **Use the new variable** for all subsequent operations

### Real-World Example

**Bad Practice: Repeated type assertions**
```typescript
// BAD: Using `as` repeatedly throughout component
const freq = (config as ToneConfig).frequency;
const B = (config as ToneConfig).B;
const cents = (config as ToneConfig).centsOffset;
```

**Good Practice: Type guard + derived variable**
```typescript
// GOOD: Check once, create derived variable, use everywhere
if (!config || !isValidToneConfig(config)) {
  return null;
}

const toneConfig = config as ToneConfig;

// Use the typed variable throughout - NO MORE CASTS NEEDED
const freq = toneConfig.frequency;
const B = toneConfig.B;
const cents = toneConfig.centsOffset;
```

### Type Guard Functions

Always prefer using helper functions for type guards:

```typescript
// Type guard function
export function isToneConfig(config: unknown): config is ToneConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'frequency' in config &&
    'B' in config
  );
}

// Usage - TypeScript now knows `config` is `ToneConfig` inside the if
if (isToneConfig(config)) {
  // config is automatically narrowed to ToneConfig here
  playTone(config.frequency, config.B);
}
```

## 10. React Hooks: Wrapper Component Pattern for Conditional Rendering

**Principle:** React Hooks must be called in the exact same order on every render. When a component needs to validate props/context before rendering, use a **wrapper component pattern**.

### The Solution: Wrapper + Inner Component

Split into two components:
1. **Wrapper component** (exported): Validates data and decides whether to render
2. **Inner component** (not exported): Contains all hooks and assumes data is valid

**GOOD: Wrapper validates, inner component uses hooks**

```typescript
// Step 1: Define props interface for validated data
interface PianoKeyboardProps {
  activeNotes: Map<number, ToneConfig>;
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
}

// Step 2: Inner component receives validated props - uses hooks freely
function PianoKeyboardIntern({
  activeNotes,
  onNoteOn,
  onNoteOff,
}: PianoKeyboardProps) {
  const [keys, setKeys] = useState<PianoKey[]>([]);

  // GOOD: All hooks called unconditionally
  useEffect(() => {
    // Initialize keyboard
    setKeys(generatePianoKeys());
  }, []);

  // ... rest of component logic

  return (
    <div className="keyboard-area">
      {/* ... component JSX */}
    </div>
  );
}

// Step 3: Wrapper component - validates and passes props to inner
export default function PianoKeyboard() {
  const activeTones = usePianoStore((s) => s.activeTones);

  // GOOD: Validate BEFORE rendering inner component
  if (!activeTones || activeTones.size === 0) {
    return <div className="keyboard-area empty" />;
  }

  return (
    <PianoKeyboardIntern
      activeNotes={activeTones}
      onNoteOn={playTone}
      onNoteOff={stopTone}
    />
  );
}
```

### Naming Convention

- **Wrapper**: Use the public component name (e.g., `PianoKeyboard`)
- **Inner**: Suffix with `Intern` (e.g., `PianoKeyboardIntern`)
  - Alternative: Prefix with `_` (e.g., `_PianoKeyboard`) if not exported

## 11. Naming Conventions

*   **Types/Interfaces/Enums**: `PascalCase` (e.g., `ToneConfig`, `PianoProfileName`, `TuningSimPhase`).
*   **Components**: `PascalCase` (e.g., `VirtualKeyboard`, `ProfilePicker`, `CentsJogWheel`).
*   **Variables/Functions**: `camelCase` (e.g., `calculateFrequency`, `isValidToneConfig`, `playTone`).
*   **Constants**: `UPPER_CASE` (e.g., `MAX_PARTIALS`, `DEFAULT_A4`, `MIDI_A0`).

## 12. File Organization

### Type Definition Files

Place type definitions in appropriate locations:

*   **Shared types**: `src/types/`
    *   `index.ts` - All shared types and constants
    *   MIDI constants, breakpoints, piano types, audio config

*   **Audio types**: Co-locate with audio code
    *   `src/audio/` - Audio engine and related types

*   **Store types**: `src/store/`
    *   `pianoStore.ts` - Zustand store types and state

*   **Components**: `src/components/`
    *   Each component in its own file
    *   Component-specific types can be in the same file

### Example File Structure

```
src/
├── types/
│   └── index.ts                 # All shared types and constants
├── audio/
│   ├── audioEngine.ts           # Audio engine implementation
│   ├── envelope.ts              # ADSR envelope
│   └── partialFreq.ts           # Partial frequency calculations
├── store/
│   └── pianoStore.ts            # Zustand store
├── hooks/
│   ├── useAudioEngine.ts        # Audio engine hook
│   └── useTuningSimulation.ts   # Tuning sim hook
├── model/
│   ├── pianoNotes.ts            # Piano note calculations
│   └── ...
├── tuning/
│   ├── stretchTargets.ts        # Stretch calculation
│   └── ...
├── bCoefficients/
│   ├── profiles.ts              # Piano profiles
│   └── rigaud.ts                # Rigaud model
├── components/
│   ├── VirtualKeyboard.tsx
│   ├── ProfilePicker.tsx
│   └── ...
└── App.tsx                      # Main app component
```

## 13. Audio-Specific Guidelines

Fake Piano deals heavily with audio and frequencies. These have specific TypeScript patterns.

### Frequency Type Safety

Always use typed frequency values rather than raw numbers:

```typescript
// BAD: Untyped frequency
const freq = 440;

// GOOD: Named constant
import { DEFAULT_A4 } from '@/types';
const freq = DEFAULT_A4;

// GOOD: Frequency type
type FrequencyHz = number;  // Frequency in Hertz
const freq: FrequencyHz = 440;
```

### MIDI Note Representations

Use constants for MIDI notes rather than magic numbers:

```typescript
// BAD: Magic numbers for MIDI notes
if (midi >= 21 && midi <= 108) { ... }

// GOOD: Named constants
import { MIDI_A0, MIDI_C8 } from '@/types';
if (midi >= MIDI_A0 && midi <= MIDI_C8) { ... }
```

### Cents Type Safety

Cents values should always be bounded and typed:

```typescript
// GOOD: Properly typed cents with validation
type CentsOffset = number;  // Typically -50 to 50

function clampCents(cents: number): CentsOffset {
  return Math.max(-50, Math.min(50, cents));
}

// Usage
const adjustedCents: CentsOffset = clampCents(rawCents);
```

## 14. Testing Guidelines

### Test File Organization

*   **Unit tests**: Co-locate with the file they test, using `.test.ts` or `.spec.ts` suffix
*   **Integration tests**: Not currently implemented

### Type Safety in Tests

Tests should also be type-safe. Avoid `any` in test code:

```typescript
// BAD: Untyped test data
const mockTone = { freq: 440 };

// GOOD: Properly typed mock
import type { ToneConfig } from '@/types';
const mockTone: ToneConfig = {
  frequency: 440,
  B: 1.0,
  centsOffset: 0,
  numPartials: 10,
  sustainDuration: 2.0,
};
```

## 15. Store (Zustand) Patterns

### Store Organization

Keep store logic organized and type-safe:

```typescript
// GOOD: Well-typed store with clear interfaces
interface PianoState {
  // State
  activeTones: Map<number, ToneConfig>;
  masterVolume: number;
  activeProfile: PianoProfileName;

  // Actions
  setMasterVolume: (volume: number) => void;
  setProfile: (profile: PianoProfileName) => void;
  playTone: (midi: number, config: ToneConfig) => void;
  stopTone: (midi: number) => void;
}

export const usePianoStore = create<PianoState>((set, get) => ({
  // Initialize state
  activeTones: new Map(),
  masterVolume: 0.5,
  activeProfile: PIANO_PROFILE_NAMES.CONCERT_GRAND,

  // Actions
  setMasterVolume: (volume) => set({ masterVolume: volume }),
  // ...
}));
```

---

**Maintained by**: Fake Piano Development Team
**Last Updated**: June 7, 2026
**Adapted from**: StroboPro TypeScript Guidelines
