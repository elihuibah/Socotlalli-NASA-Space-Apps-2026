/**
 * Calibración por disco.
 *
 * La tabla de mapeo no cambia (mismo rasgo → mismo parámetro). Lo que se
 * calibra es la escala: cada disco mide cosas distintas y con rangos de
 * cambio muy distintos (en CO₂ casi todo es "normal"), así que los cortes
 * fijos dejaban la música plana. Al cargar el disco se miden sus datos y se
 * ponen los cortes en percentiles de ese mismo disco.
 *
 * Es determinista: el mismo disco siempre produce la misma calibración,
 * así que la misma imagen siempre suena igual.
 */
import { hasData, rawNeighborVariation } from "./mapping";
import { rawFrameChange } from "./rhythm";
import type { Disc, Subdivision, TensionLevel } from "./types";

export interface Calibration {
  /** Cortes de |anomalía| para pasar a tensión 1, 2 y 3. */
  tensionCuts: [number, number, number];
  /** Cortes de variación entre vecinos para 8n, 8t y 16n. */
  densityCuts: [number, number, number];
  /** Cambio medio entre fotogramas que equivale a 120 BPM. */
  maxFrameChange: number;
}

/**
 * Qué parte de las celdas cae en cada nivel.
 * Tensión: 55 % limpia, 25 % séptimas, 15 % novenas, 5 % tritonos.
 * Densidad: 40 % negras, 30 % corcheas, 20 % tresillos, 10 % semicorcheas.
 */
const TENSION_PERCENTILES = [0.55, 0.8, 0.95] as const;
const DENSITY_PERCENTILES = [0.4, 0.7, 0.9] as const;

/**
 * Pisos mínimos: si un disco es casi uniforme, sus percentiles son diminutos
 * y cualquier ruido sonaría tenso. Con el piso, un disco "normal" sigue
 * sonando limpio.
 */
const TENSION_FLOOR = [0.05, 0.12, 0.25] as const;
const DENSITY_FLOOR = [0.005, 0.01, 0.02] as const;
const FRAME_CHANGE_FLOOR = 0.005;

/** Valores por defecto (los cortes originales) si no hay datos suficientes. */
export const DEFAULT_CALIBRATION: Calibration = {
  tensionCuts: [0.15, 0.35, 0.6],
  densityCuts: [0.0625, 0.125, 0.1875],
  maxFrameChange: 0.1,
};

export function calibrate(disc: Disc): Calibration {
  const anomalies: number[] = [];
  const variations: number[] = [];
  const { cols, rows } = disc.grid;

  for (const frame of disc.frames) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!hasData(disc, col, row)) continue;
        anomalies.push(Math.abs(frame.anomaly[row * cols + col]));
        variations.push(rawNeighborVariation(frame.values, disc, col, row));
      }
    }
  }
  if (anomalies.length === 0) return DEFAULT_CALIBRATION;

  let maxChange = 0;
  for (let i = 1; i < disc.frames.length; i++) {
    maxChange = Math.max(maxChange, rawFrameChange(disc.frames[i - 1], disc.frames[i], disc.mask));
  }

  return {
    tensionCuts: cuts(anomalies, TENSION_PERCENTILES, TENSION_FLOOR),
    densityCuts: cuts(variations, DENSITY_PERCENTILES, DENSITY_FLOOR),
    maxFrameChange: disc.frames.length > 1 ? Math.max(maxChange, FRAME_CHANGE_FLOOR) : DEFAULT_CALIBRATION.maxFrameChange,
  };
}

/** |anomalía| → nivel de tensión según los cortes del disco. */
export function tensionFor(anomaly: number, cal: Calibration): TensionLevel {
  return levelFor(Math.abs(anomaly), cal.tensionCuts) as TensionLevel;
}

const SUBDIVISIONS: readonly Subdivision[] = ["4n", "8n", "8t", "16n"];

/** Variación entre vecinos → duración de nota según los cortes del disco. */
export function subdivisionFor(variation: number, cal: Calibration): Subdivision {
  return SUBDIVISIONS[levelFor(variation, cal.densityCuts)];
}

/** Cambio entre fotogramas → 0..1 relativo al mayor cambio del disco. */
export function normalizedFrameChange(change: number, cal: Calibration): number {
  return Math.max(0, Math.min(1, change / cal.maxFrameChange));
}

function levelFor(x: number, cutsArr: readonly [number, number, number]): number {
  if (x < cutsArr[0]) return 0;
  if (x < cutsArr[1]) return 1;
  if (x < cutsArr[2]) return 2;
  return 3;
}

function cuts(
  data: number[],
  percentiles: readonly [number, number, number],
  floor: readonly [number, number, number],
): [number, number, number] {
  // Los ceros exactos (p. ej. 72 % de CO₂: "nada sobre el umbral") se excluyen;
  // si no, los percentiles serían 0 y no habría escala. Esas celdas siguen
  // cayendo en el nivel 0, que es lo que deben sonar.
  const nonZero = data.filter((x) => x > 0);
  const sorted = (nonZero.length ? nonZero : data).sort((a, b) => a - b);
  const out = percentiles.map((p, i) => Math.max(quantile(sorted, p), floor[i]));
  // Asegura cortes estrictamente crecientes.
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + 1e-6);
  return [out[0], out[1], out[2]];
}

function quantile(sorted: number[], p: number): number {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[i];
}
