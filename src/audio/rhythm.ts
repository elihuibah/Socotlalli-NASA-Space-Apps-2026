/**
 * Ritmo y tempo.
 *
 * - Variación entre píxeles vecinos → densidad rítmica (negras a semicorcheas).
 * - Cambio entre fotogramas → tempo de 60 a 120 BPM.
 *
 * Las escalas de cada disco se calculan en calibration.ts.
 */
import type { Frame } from "./types";

export const MIN_BPM = 60;
export const MAX_BPM = 120;

/** Cambio 0..1 (ya normalizado por la calibración) → BPM. */
export function changeToTempo(change: number): number {
  return Math.round(MIN_BPM + clamp01(change) * (MAX_BPM - MIN_BPM));
}

/**
 * Cambio medio absoluto de `values` entre dos fotogramas, sin escalar.
 * Si `mask` existe, solo cuenta celdas con dato.
 */
export function rawFrameChange(prev: Frame | undefined, next: Frame, mask?: number[]): number {
  if (!prev) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < next.values.length; i++) {
    if (mask && !mask[i]) continue;
    sum += Math.abs(next.values[i] - prev.values[i]);
    count++;
  }
  return count === 0 ? 0 : sum / count;
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
