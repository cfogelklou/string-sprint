// In-app help content for Fake Piano. Plain serializable data (no JSX) so it
// stays easy to edit and is i18n-ready. Section `id`s are typed keys — they are
// also the scroll anchors used by openHelp(id).

export const HELP_SECTION_IDS = [
  'getting-started',
  'tuning-practice',
  'calibration-test',
  'b-curve',
  'cents',
  'partials',
  'profiles',
] as const;

export type HelpSectionId = (typeof HELP_SECTION_IDS)[number];

export interface HelpSection {
  id: HelpSectionId;
  title: string;
  /** Paragraphs rendered as <p>. */
  body: string[];
  /** Optional ordered list rendered as <ol>. */
  steps?: string[];
  /** Optional highlighted callout rendered as <aside>. */
  tip?: string;
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started (two-device setup)',
    body: [
      'Fake Piano is a tone generator that simulates a piano. It is meant to be used together with the Strobopro tuner app running on a second device.',
      'Fake Piano produces tones with a mathematically known inharmonicity, so Strobopro has something accurate to measure.',
    ],
    steps: [
      'Open Fake Piano on device A (the tone generator).',
      'Open Strobopro on device B (the tuner).',
      'Place device B’s microphone near device A’s speaker.',
      'Pick the same piano Profile in both apps (e.g. "Upright").',
      'Tap a key — Strobopro should read 0.0 cents when this app’s cents offset is 0.',
      'Adjust cents with the jog wheel — Strobopro should read the matching offset.',
    ],
  },
  {
    id: 'tuning-practice',
    title: 'Tuning Practice (ear-training game)',
    body: [
      'A practice game for tuning by ear. When you start it, every key on the keyboard is detuned by a random amount (within ±50 cents).',
      'The target is flat: bring every note to exactly 0.0 cents (equal temperament, no stretch). There is no sharp/flat hint and no cents readout during the game — you tune by ear.',
    ],
    steps: [
      'Tap a detuned key and hold it.',
      'Read the pitch error on a second device running Strobopro, held nearby.',
      'Use the Cents jog wheel to dial the note back to 0.0 cents.',
      'Tap "Commit" to lock in that key and move to the next.',
      'When you’re done, tap "Reveal Results" for a grade (A+ to F).',
    ],
    tip: 'You need a second device running Strobopro — Fake Piano gives you no cents readout during the game on purpose.',
  },
  {
    id: 'calibration-test',
    title: 'Calibration Test (Strobopro accuracy check)',
    body: [
      'A 5-step wizard (formerly called "PTA Test" — PTA stands for Piano Tuning Assistant) that checks how accurately Strobopro measures a piano.',
      'Fake Piano is the speaker: it plays tones whose inharmonicity (the B value) is known exactly. Strobopro is the listener: it measures those tones. The test compares Strobopro’s measurements against the known truth and gives a letter grade.',
    ],
    steps: [
      'Setup: pick piano type, octave style, and the A4 reference frequency.',
      'Bridge break: confirm where wound bass strings meet plain treble wire.',
      'Measure: play each of 8 sample notes, read the B value off Strobopro, and type it in.',
      'Review: compare the generated stretch curve against Strobopro’s.',
      'Results: see your accuracy grade and per-note errors.',
    ],
  },
  {
    id: 'b-curve',
    title: 'B Curve (inharmonicity)',
    body: [
      'Piano strings are stiff, so their upper harmonics (overtones) ring slightly sharp. This effect is called inharmonicity, and each note’s amount of it is its B coefficient.',
      'The B Curve shows B across all 88 keys: long bass strings have low B, short treble strings have higher B. The exact relationship is fₙ = n·f₁·√((1+B·n²)/(1+B)), where fₙ is the n-th partial.',
      'Open the B Curve editor to pick a preset piano profile, or switch to Custom mode to shape the curve yourself with the Rigaud model parameters.',
    ],
  },
  {
    id: 'cents',
    title: 'Cents',
    body: [
      'A cent is 1/100th of a semitone (the distance between two adjacent keys). The Cents jog wheel lets you fine-tune the selected note’s pitch from −100 to +100 cents, at 0.1-cent precision.',
      'Drag left/right to adjust; faster drags move further, and momentum carries after release. The readout turns green when the note is within ±0.1 cents of in-tune.',
    ],
    tip: 'Keyboard shortcuts: Q/A = ±1¢, W/S = ±0.1¢, E/D = ±0.01¢, R = reset.',
  },
  {
    id: 'partials',
    title: 'Partials',
    body: [
      'A piano tone is built from several sine waves: the fundamental pitch plus higher overtones called partials. Because of inharmonicity, the higher partials sound sharp.',
      'The Partials slider (1–10) controls how many partials each tone uses. More partials give a richer, more realistic tone but use more CPU.',
    ],
  },
  {
    id: 'profiles',
    title: 'Profiles',
    body: [
      'A Profile is a complete B curve for a particular kind of piano. Fake Piano ships 8 presets copied from real pianos, from a large Concert Grand (low inharmonicity) to a small Spinet (high inharmonicity).',
      'Changing the profile regenerates all 88 keys’ B values, so the tone and the calibration truth change together. Use the same profile on both devices when testing Strobopro.',
    ],
  },
];
