/**
 * Ritmo y tempo.
 *
 * - Variación entre píxeles vecinos → densidad rítmica (negras a semicorcheas).
 * - Cambio entre fotogramas → tempo de 60 a 120 BPM.
 */
import type { Frame, Subdivision } from "./types";

export const MIN_BPM = 60;
export const MAX_BPM = 120;

/** De menos a más denso. */
const SUBDIVISIONS: readonly Subdivision[] = ["4n", "8n", "8t", "16n"];

/** Variación local 0..1 → duración de nota. */
export function densityToSubdivision(variation: number): Subdivision {
  const i = Math.min(SUBDIVISIONS.length - 1, Math.floor(clamp01(variation) * SUBDIVISIONS.length));
  return SUBDIVISIONS[i];
}

/** Cambio medio 0..1 entre fotogramas → BPM. */
export function changeToTempo(change: number): number {
  return Math.round(MIN_BPM + clamp01(change) * (MAX_BPM - MIN_BPM));
}

/**
 * Cambio medio absoluto de `values` entre dos fotogramas, normalizado 0..1.
 * Si `mask` existe, solo cuenta celdas con dato.
 */
export function frameChange(prev: Frame | undefined, next: Frame, mask?: number[]): number {
  if (!prev) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < next.values.length; i++) {
    if (mask && !mask[i]) continue;
    sum += Math.abs(next.values[i] - prev.values[i]);
    count++;
  }
  if (count === 0) return 0;
  // TODO(audio): calibrar la escala con los discos reales; 0.1 de cambio medio ya es mucho.
  return clamp01((sum / count) * 10);
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
