/**
 * Instrumentos: un timbre por disco.
 *
 * Nivel 1–2: sintetizadores (Tone.PolySynth).
 * Nivel 3: guitarras grabadas (Tone.Sampler con archivos en public/samples).
 * El cambio es transparente: los dos se tocan con triggerAttackRelease.
 */
import * as Tone from "tone";
import type { InstrumentPreset } from "./types";

export const PRESETS: Record<string, InstrumentPreset> = {
  default: {
    id: "default",
    oscillator: "triangle",
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.8 },
    baseOctave: 4,
  },
  sst: {
    id: "sst",
    oscillator: "sine",
    envelope: { attack: 0.05, decay: 0.3, sustain: 0.5, release: 1.2 },
    baseOctave: 4,
  },
  co2: {
    id: "co2",
    oscillator: "fmsine",
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.6 },
    baseOctave: 3,
  },
  // Tercer disco: el plan propone hielo marino o vegetación. La clave debe
  // coincidir con el "id" del disc.json que entregue Datos.
  ice: {
    id: "ice",
    // Campanas frías, ataque rápido y cola larga (evoca armónicos de guitarra).
    oscillator: "amsine",
    envelope: { attack: 0.005, decay: 0.4, sustain: 0.2, release: 1.6 },
    baseOctave: 5,
  },
  vegetation: {
    id: "vegetation",
    // Cálido y redondo, registro medio-grave.
    oscillator: "fatsawtooth",
    envelope: { attack: 0.08, decay: 0.3, sustain: 0.5, release: 0.9 },
    baseOctave: 3,
  },
  // TODO(audio, nivel 3): preset "guitar" con samples:
  // samples: { baseUrl: "samples/classical/", urls: { E2: "E2.mp3", G2: "G2.mp3", ... } }
};

export function presetFor(discId: string): InstrumentPreset {
  return PRESETS[discId] ?? PRESETS.default;
}

type Voice = Tone.PolySynth | Tone.Sampler;

export class Instrument {
  readonly preset: InstrumentPreset;
  private voice: Voice;

  constructor(preset: InstrumentPreset, destination: Tone.InputNode) {
    this.preset = preset;
    this.voice = preset.samples ? createSampler(preset) : createSynth(preset);
    this.voice.connect(destination);
  }

  /** true cuando los samples (si hay) terminaron de cargar. */
  get loaded(): boolean {
    return this.voice instanceof Tone.Sampler ? this.voice.loaded : true;
  }

  play(notes: string | string[], duration: Tone.Unit.Time, time?: Tone.Unit.Time, velocity = 0.8): void {
    this.voice.triggerAttackRelease(notes, duration, time, velocity);
  }

  releaseAll(time?: Tone.Unit.Time): void {
    this.voice.releaseAll(time);
  }

  dispose(): void {
    this.voice.dispose();
  }
}

function createSynth(preset: InstrumentPreset): Tone.PolySynth {
  return new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: preset.oscillator },
    envelope: preset.envelope,
  } as Tone.SynthOptions);
}

function createSampler(preset: InstrumentPreset): Tone.Sampler {
  const { baseUrl, urls } = preset.samples!;
  return new Tone.Sampler({ urls, baseUrl, release: preset.envelope.release });
}
