/**
 * Modo barrido: recorre las columnas de oeste a este (col 0 → cols-1).
 * Al terminar un barrido pasa al siguiente fotograma.
 *
 * En cada columna suena la celda con mayor |anomalía| (la más llamativa),
 * así la fila (latitud) decide el registro y la columna (longitud) el paneo.
 */
import { sampleCell } from "../mapping";
import type { CellSample, Disc, ListeningMode } from "../types";

export class ScanMode implements ListeningMode {
  readonly name = "scan" as const;
  private disc: Disc;
  private col = 0;
  private frame = 0;

  constructor(disc: Disc) {
    this.disc = disc;
  }

  get frameIndex(): number {
    return this.frame;
  }

  get currentCol(): number {
    return this.col;
  }

  next(): CellSample | null {
    const sample = this.pickCell(this.col);
    this.col++;
    if (this.col >= this.disc.grid.cols) {
      this.col = 0;
      this.frame = (this.frame + 1) % this.disc.frames.length;
    }
    return sample;
  }

  reset(): void {
    this.col = 0;
    this.frame = 0;
  }

  seek(frameIndex: number): void {
    const n = this.disc.frames.length;
    this.col = 0;
    this.frame = ((frameIndex % n) + n) % n;
  }

  /** Celda con dato y mayor |anomalía| de la columna; null si toda la columna está vacía. */
  private pickCell(col: number): CellSample | null {
    let best: CellSample | null = null;
    for (let row = 0; row < this.disc.grid.rows; row++) {
      const s = sampleCell(this.disc, this.frame, col, row);
      if (!s.hasData) continue;
      if (!best || Math.abs(s.anomaly) > Math.abs(best.anomaly)) best = s;
    }
    return best;
  }
}
