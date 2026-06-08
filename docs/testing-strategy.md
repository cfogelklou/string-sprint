# PTA Testing Strategy

## 1. Purpose

Fakepiano is a **deterministic test oracle** for Strobopro's Piano Tuning Assistant (PTA). It synthesizes tones with mathematically precise inharmonicity (B coefficients) and cents offsets, providing ground-truth signals that real pianos cannot. This document defines how each PTA concept maps to a testable behavior in Fakepiano.

## 2. Concept Coverage Map

| PTA Concept | Strobopro Behavior | Fakepiano Test Capability |
|---|---|---|
| Piano Type (6 types) | Select piano classification → sets default bridge break + loads B profile | Select profile → tones generated with exact B values from `PIANO_B_PROFILES` |
| Octave Style (4:2, 6:3, pure-12ths, concert-grand) | Determines which partials to align for stretch curve | Generate stretch curve using `calculateRailsbackOffset` with specific alignment |
| Reference Frequency | Sets A4 pitch standard (default 440 Hz) | Override `referenceFreq` in store → all `midiToFreq` calls use new reference |
| Bridge Break | User identifies wound→plain string transition | Informative: shows default bridge break note for selected type, explains wound vs plain strings, optional slider to adjust |
| Sample Note Measurement | FFT harmonic capture on 8 notes → compute B via regression | Play tone with known B → user measures with Strobopro → enters B for comparison |
| Stretch Curve Generation | Propagate from A4 outward using partial alignment | Compare generated cents offsets to expected Railsback curve |

## 3. Test Scenarios

### TS-01: Profile Tone Verification
**Setup**: Select a piano profile (e.g., Spinet). Play any note.
**Expected**: Strobopro reads 0¢ deviation at the exact equal temperament frequency for that note.
**Pass**: Strobopro displays ≤0.1¢ error.

### TS-02: Octave Style Stretch Verification
**Setup**: Generate stretch curve with 4:2 octave style on Concert Grand profile.
**Expected**: Bass stretched flat, treble stretched sharp. Curve matches `calculateRailsbackOffset` output.
**Pass**: Each note within ±0.5¢ of expected offset.

### TS-03: Reference Frequency Shift
**Setup**: Set A4 = 442 Hz. Play A4.
**Expected**: Strobopro tracks at 442 Hz exactly (0¢ at 442, not 440).
**Pass**: Frequency readout within ±0.1 Hz of 442.

### TS-04: Bridge Break (Informative)
**Setup**: Select piano type.
**Expected**: App displays the default bridge break note for that type, with explanation of wound vs plain strings.
**Pass**: Correct default shown. User can optionally adjust the value.

### TS-05: Sample Note B Measurement
**Setup**: Play a sample note with known B coefficient. User measures with Strobopro.
**Expected**: Strobopro's computed B matches Fakepiano's ground truth.
**Pass**: Within ±10% relative error or ±0.0002 absolute.

### TS-06: Full PTA Workflow
**Setup**: Run all 5 PTA steps end-to-end on a specific piano type.
**Expected**: Final tuning curve matches the expected curve for that profile + octave style.
**Pass**: Mean absolute cents error <1.0¢ across all 88 notes.

## 4. Ground Truth B Values

B coefficients at each of the 8 sample note positions for all 6 profiles.
Array index = midi - 21 (MIDI_A0).

| Sample Note | MIDI | Index | Concert Grand | Studio Grand | Baby Grand | Upright | Console | Spinet |
|---|---|---|---|---|---|---|---|---|
| A1 | 33 | 12 | 0.0000516 | 0.0001342 | 0.0002562 | 0.0004415 | 0.0008217 | 0.0018662 |
| E2 | 40 | 19 | 0.0000241 | 0.0000665 | 0.0001381 | 0.0002617 | 0.0005081 | 0.0012059 |
| B2 | 47 | 26 | 0.0000199 | 0.0000451 | 0.0000895 | 0.0001902 | 0.0003643 | 0.0008584 |
| E3 | 52 | 31 | 0.0000251 | 0.0000467 | 0.0000819 | 0.0001883 | 0.0003413 | 0.0007606 |
| A3 | 57 | 36 | 0.0000369 | 0.0000606 | 0.0000937 | 0.0002265 | 0.0003830 | 0.0007834 |
| A4 | 69 | 48 | 0.0001083 | 0.0001638 | 0.0002229 | 0.0005568 | 0.0008549 | 0.0014967 |
| A5 | 81 | 60 | 0.0002993 | 0.0004493 | 0.0006007 | 0.0015023 | 0.0022626 | 0.0038075 |
| A6 | 93 | 72 | 0.0009973 | 0.0014960 | 0.0019952 | 0.0049883 | 0.0074858 | 0.0124911 |

## 5. Tolerances

| Measurement | Tolerance | Rationale |
|---|---|---|
| B coefficient | ±10% relative OR ±0.0002 absolute (whichever is greater) | Strobe FFT precision limits; small B values harder to measure precisely |
| Stretch curve cents | ±0.5¢ per note | Strobopro's sub-cent phase-lock precision |
| Reference frequency | ±0.1 Hz | Human pitch perception threshold |

## 6. PTA Piano Types

| Type | Profile Key | Bridge Break (MIDI) | Bridge Break (Note) | Character |
|---|---|---|---|---|
| Concert Grand | `concertGrand` | 44 | G#2 | Lowest inharmonicity, longest strings |
| Studio Grand | `studioGrand` | 45 | A2 | Low inharmonicity |
| Baby Grand | `babyGrand` | 46 | A#2 | Moderate inharmonicity |
| Upright | `upright` | 47 | B2 | Default profile |
| Console | `console` | 48 | C3 | Higher inharmonicity |
| Spinet | `spinet` | 50 | D3 | Highest inharmonicity, shortest strings |

## 7. Octave Styles

| Style | Lower Partial | Upper Partial | Span | Description |
|---|---|---|---|---|
| 4:2 | 4 | 2 | 12 (octave) | Standard stretch, aligns 4th partial with 2nd |
| 6:3 | 6 | 3 | 12 (octave) | Wider stretch, aligns 6th partial with 3rd |
| Pure 12ths | 3 | 1 | 19 (octave+fifth) | Widest stretch, aligns 3rd partial with fundamental of note 19 semitones up |
| Concert Grand | 4:2 or 6:3 | 2 or 3 | 12 | Hybrid: 6:3 below bridge break, 4:2 above |
