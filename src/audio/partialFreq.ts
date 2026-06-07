/**
 * Calculate the frequency of the nth partial of a piano string with inharmonicity.
 * Formula: f_n = n * f1 * sqrt((1 + B*n^2) / (1 + B))
 * Must match strobopro's inharmonicity.ts:431 exactly.
 */
export function partialFreq(f1: number, B: number, n: number): number {
  return n * f1 * Math.sqrt((1 + B * n * n) / (1 + B));
}

/**
 * Convert cents offset to frequency ratio.
 * ratio = 2^(cents/1200)
 */
export function centsToFreqRatio(cents: number): number {
  return Math.pow(2, cents / 1200);
}
