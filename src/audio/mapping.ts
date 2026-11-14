/**
 * La tabla de mapeo imagen → música (fija desde el sábado 10:00).
 *
 * | Rasgo                         | Parámetro                              |
 * |-------------------------------|----------------------------------------|
 * | Valor de la zona              | Altura dentro de la escala             |
 * | Signo de la anomalía          | Timbre: brillante / oscuro             |
 * | Tamaño de la anomalía         | Tensión armónica                       |
 * | Variación entre vecinos       | Densidad rítmica                       |
 * | Cambio entre fotogramas       | Tempo (ver rhythm.ts)                  |
 * | Longitud y latitud            | Paneo y registro (modo barrido)        |
 *
 * Los cortes de tensión y densidad se calibran por disco (calibration.ts).
 */
import { subdivisionFor, tensionFor, type Calibration } from "./calibration";
import type { Harmony } from "./harmony";
import { clamp01 } from "./rhythm";
import type { Brightness, CellSample, Disc, MusicalParams } from "./types";

/** Cuántos grados de escala cubre el rango de valores 0..1. */
export const DEGREE_SPAN = 10;

// ---------------------------------------------------------------------------
// Lectura del disco
// ---------------------------------------------------------------------------

export function cellIndex(disc: Disc, col: number, row: number): number {
  return row * disc.grid.cols + col;
}

export function hasData(disc: Disc, col: number, row: number): boolean {
  return disc.mask ? disc.mask[cellIndex(disc, col, row)] === 1 : true;
}

/**
 * Desviación media de la celda respecto a sus 4 vecinos con dato, sin escalar (0..1).
 * La calibración del disco decide qué tanto es "mucho".
 */
export function rawNeighborVariation(values: number[], disc: Disc, col: number, row: number): number {
  const { cols, rows } = disc.grid;
  const center = values[cellIndex(disc, col, row)];
  const offsets = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  let sum = 0;
  let count = 0;
  for (const [dc, dr] of offsets) {
    const c = col + dc;
    const r = row + dr;
    if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
    if (!hasData(disc, c, r)) continue;
    sum += Math.abs(values[cellIndex(disc, c, r)] - center);
    count++;
  }
  return count ? clamp01(sum / count) : 0;
}

/** Lee una celda de un fotograma con todo lo que necesita el mapeo. */
export function sampleCell(disc: Disc, frameIndex: number, col: number, row: number): CellSample {
  const frame = disc.frames[frameIndex];
  const i = cellIndex(disc, col, row);
  return {
    col,
    row,
    frameIndex,
    value: frame.values[i],
    anomaly: frame.anomaly[i],
    neighborVariation: rawNeighborVariation(frame.values, disc, col, row),
    hasData: hasData(disc, col, row),
  };
}

// ---------------------------------------------------------------------------
// Rasgo → parámetro
// ---------------------------------------------------------------------------

/** Valor 0..1 → grado de escala; más valor, más agudo. */
export function valueToDegree(value: number): number {
  return Math.round(clamp01(value) * DEGREE_SPAN);
}

export function anomalyToBrightness(anomaly: number): Brightness {
  return anomaly >= 0 ? "bright" : "dark";
}

/** Columna (oeste → este) → paneo -1..1. */
export function colToPan(col: number, cols: number): number {
  return cols > 1 ? (col / (cols - 1)) * 2 - 1 : 0;
}

/** Fila (norte arriba) → desplazamiento de octava: norte agudo, sur grave. */
export function rowToOctaveShift(row: number, rows: number): number {
  const fromCenter = (rows - 1) / 2 - row; // positivo hacia el norte
  return Math.round(fromCenter / (rows / 2)); // -1, 0 o 1
}

/** Aplica toda la tabla de mapeo a una celda. */
export function mapCell(
  sample: CellSample,
  disc: Disc,
  harmony: Harmony,
  cal: Calibration,
  opts: { useLatLon: boolean } = { useLatLon: true },
): MusicalParams {
  const scaleLen = harmony.scale.length;
  const octaveShift = opts.useLatLon ? rowToOctaveShift(sample.row, disc.grid.rows) : 0;
  const degree = valueToDegree(sample.value) + octaveShift * scaleLen;
  return {
    degree,
    midi: harmony.degreeToMidi(degree),
    tension: tensionFor(sample.anomaly, cal),
    brightness: anomalyToBrightness(sample.anomaly),
    subdivision: subdivisionFor(sample.neighborVariation, cal),
    pan: opts.useLatLon ? colToPan(sample.col, disc.grid.cols) : 0,
    velocity: 0.5 + 0.5 * Math.abs(sample.anomaly),
  };
}
