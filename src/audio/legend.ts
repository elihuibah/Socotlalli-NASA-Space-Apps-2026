/**
 * Leyenda sonora ("cómo se escucha"): ejemplos cortos que explican el mapeo
 * de oído, para personas ciegas o con baja visión.
 *
 * Cada entrada lleva el texto para el lector de pantalla y una función
 * que toca el ejemplo con el instrumento del disco activo.
 */
import type { EffectsChain } from "./effects";
import type { Harmony } from "./harmony";
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
  ctx.instrument.play(ctx.harmony.chord(midi, tension), "2n", time);
}

export const LEGEND: LegendItem[] = [
  {
    id: "pitch",
    label: "Valor bajo suena grave; valor alto suena agudo.",
    play(ctx, time) {
      [0, 3, 6, 10].forEach((deg, i) => {
        ctx.instrument.play(ctx.harmony.degreeToMidi(deg), "8n", time + i * 0.3);
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
      // De izquierda a derecha, como un barrido completo.
      for (let i = 0; i < 9; i++) {
        const at = time + i * 0.25;
        ctx.effects.setPan(-1 + i * 0.25, at);
        ctx.instrument.play(ctx.harmony.degreeToMidi(2 + (i % 5)), "8n", at);
      }
      ctx.effects.setPan(0, time + 2.5);
    },
  },
  {
    id: "density",
    label: "Una zona pareja suena con notas largas; una zona muy variada, con notas rápidas.",
    play(ctx, time) {
      const note = ctx.harmony.degreeToMidi(4);
      // Negras y luego semicorcheas, a 90 pulsos por minuto.
      [0, 0.67, 1.33].forEach((t) => ctx.instrument.play(note, "4n", time + t));
      for (let i = 0; i < 8; i++) ctx.instrument.play(note, "16n", time + 2.2 + i * 0.167);
    },
  },
  {
    id: "tempo",
    label: "Si el mapa cambia poco de un fotograma al siguiente, el ritmo es lento; si cambia mucho, es rápido.",
    play(ctx, time) {
      const notes = [0, 2, 4, 2].map((d) => ctx.harmony.degreeToMidi(d));
      notes.forEach((m, i) => ctx.instrument.play(m, "8n", time + i * 0.5)); // 60 pulsos por minuto
      notes.forEach((m, i) => ctx.instrument.play(m, "8n", time + 2.3 + i * 0.25)); // 120
    },
  },
];
