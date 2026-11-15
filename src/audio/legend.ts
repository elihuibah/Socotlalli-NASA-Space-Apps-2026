
import type { EffectsChain } from "./effects";
import { midiToNote, type Harmony } from "./harmony";
import type { Instrument } from "./instruments";
import type { TensionLevel } from "./types";

export interface LegendItem {
  id: string;
  /** Texto para mostrar y para el lector de pantalla. */
  label: string;
  play(ctx: LegendContext, time: number): void;
}

export interface LegendContext {
  instrument: Instrument;
  effects: EffectsChain;
  harmony: Harmony;
}

function playChord(ctx: LegendContext, degree: number, tension: TensionLevel, time: number): void {
  const midi = ctx.harmony.degreeToMidi(degree);
  const notes = ctx.harmony.chord(midi, tension).map(midiToNote);
  ctx.instrument.play(notes, "2n", time);
}

export const LEGEND: LegendItem[] = [
  {
    id: "pitch",
    label: "Valor bajo suena grave; valor alto suena agudo.",
    play(ctx, time) {
      [0, 3, 6, 10].forEach((deg, i) => {
        ctx.instrument.play(midiToNote(ctx.harmony.degreeToMidi(deg)), "8n", time + i * 0.3);
      });
    },
  },
  {
    id: "tension",
    label: "Cerca de lo normal la armonía es limpia; lejos de lo normal hay más tensión.",
    play(ctx, time) {
      ([0, 1, 2, 3] as TensionLevel[]).forEach((t, i) => playChord(ctx, 0, t, time + i * 0.9));
    },
  },
  {
    id: "brightness",
    label: "Sobre lo normal suena brillante; debajo de lo normal suena oscuro.",
    play(ctx, time) {
      ctx.effects.setBrightness("bright", time);
      playChord(ctx, 2, 0, time);
      ctx.effects.setBrightness("dark", time + 1);
      playChord(ctx, 2, 0, time + 1);
    },
  },
  {
    id: "pan",
    label: "En el barrido, el oeste suena a la izquierda y el este a la derecha.",
    play(ctx, time) {
      ctx.effects.setPan(-1, time);
      playChord(ctx, 2, 0, time);
      ctx.effects.setPan(1, time + 1);
      playChord(ctx, 2, 0, time + 1);
    },
  },
];
