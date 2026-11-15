
import type { TensionLevel } from "./types";

/** Intervalos en semitonos desde la tónica. */
export const SCALES = {
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
} as const satisfies Record<string, readonly number[]>;

export type ScaleName = keyof typeof SCALES;

export const TENSION_CHORDS: Record<TensionLevel, readonly number[]> = {
  0: [0, 4, 7], // tríada mayor
  1: [0, 4, 7, 10], // séptima de dominante
  2: [0, 3, 7, 10, 14], // menor con séptima y novena
  3: [0, 1, 6, 10], // segunda menor + tritono
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

  /** Notas MIDI del acorde construido sobre `midi` con la tensión dada. */
  chord(midi: number, tension: TensionLevel): number[] {
    return TENSION_CHORDS[tension].map((interval) => midi + interval);
  }
}

export function midiToNote(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[((midi % 12) + 12) % 12]}${octave}`;
}
