/**
 * Modo región ("lugar en el tiempo"): una sola celda elegida por el usuario
 * suena a lo largo de los fotogramas, para oír cómo cambia ese lugar.
 */
import { sampleCell } from "../mapping";
import type { CellSample, Disc, ListeningMode } from "../types";

/** Cuántas notas suena cada fotograma antes de avanzar al siguiente. */
export const NOTES_PER_FRAME = 4;

export class RegionMode implements ListeningMode {
  readonly name = "region" as const;
  private disc: Disc;
  private col: number;
  private row: number;
  private frame = 0;
  private step = 0;

  constructor(disc: Disc, col = Math.floor(disc.grid.cols / 2), row = Math.floor(disc.grid.rows / 2)) {
    this.disc = disc;
    this.col = col;
    this.row = row;
  }

  get frameIndex(): number {
    return this.frame;
  }

  setRegion(col: number, row: number): void {
    const { cols, rows } = this.disc.grid;
    this.col = Math.max(0, Math.min(cols - 1, col));
    this.row = Math.max(0, Math.min(rows - 1, row));
  }

  next(): CellSample | null {
    const sample = sampleCell(this.disc, this.frame, this.col, this.row);
    this.step++;
    if (this.step >= NOTES_PER_FRAME) {
      this.step = 0;
      this.frame = (this.frame + 1) % this.disc.frames.length;
    }
    return sample.hasData ? sample : null;
  }

  reset(): void {
    this.frame = 0;
    this.step = 0;
  }

  seek(frameIndex: number): void {
    const n = this.disc.frames.length;
    this.frame = ((frameIndex % n) + n) % n;
    this.step = 0;
  }

  get region(): { col: number; row: number } {
    return { col: this.col, row: this.row };
  }
}
