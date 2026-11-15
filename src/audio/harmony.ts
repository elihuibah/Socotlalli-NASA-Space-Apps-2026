
import type { TensionLevel } from "./types";

/** Intervalos en semitonos desde la tónica. */
export const SCALES = {
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
} as const satisfies Record<string, readonly number[]>;

export type ScaleName = keyof typeof SCALES;

/**
 * Más tensión = más color, no más disonancia: todos los acordes son consonantes
 * (sin segundas menores ni tritonos) y se ajustan a la escala activa.
 */
export const TENSION_CHORDS: Record<TensionLevel, readonly number[]> = {
  0: [0, 4, 7], // tríada mayor
  1: [0, 4, 7, 9], // con sexta
  2: [0, 4, 7, 14], // con novena (add9)
  3: [0, 4, 7, 9, 14], // sexta y novena, abierto y brillante
};

export class Harmony {
  scale: readonly number[];
  /** Nota MIDI de la tónica (60 = C4). */
  root: number;

  constructor(scale: ScaleName = "majorPentatonic", root = 60) {
    this.scale = SCALES[scale];
    this.root = root;
  }

  setScale(scale: ScaleName): void {
    this.scale = SCALES[scale];
  }

  setRoot(midi: number): void {
    this.root = midi;
  }

  /** Grado de la escala (puede pasar de una octava) → nota MIDI. */
  degreeToMidi(degree: number): number {
    const len = this.scale.length;
    const octave = Math.floor(degree / len);
    const step = ((degree % len) + len) % len;
    return this.root + octave * 12 + this.scale[step];
  }

  /** Nota de la escala más cercana a `midi` (en empate, la más grave). */
  snap(midi: number): number {
    let best = midi;
    let bestDist = Infinity;
    const base = Math.floor((midi - this.root) / 12) * 12 + this.root;
    for (const octave of [-12, 0, 12]) {
      for (const step of this.scale) {
        const candidate = base + octave + step;
        const dist = Math.abs(candidate - midi);
        if (dist < bestDist || (dist === bestDist && candidate < best)) {
          best = candidate;
          bestDist = dist;
        }
      }
    }
    return best;
  }

  /** Notas MIDI del acorde construido sobre `midi` con la tensión dada, dentro de la escala. */
  chord(midi: number, tension: TensionLevel): number[] {
    const notes = TENSION_CHORDS[tension].map((interval) => this.snap(midi + interval));
    return [...new Set(notes)];
  }
}

export function midiToNote(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[((midi % 12) + 12) % 12]}${octave}`;
}
