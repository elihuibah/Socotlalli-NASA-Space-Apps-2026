/**
 * Instrumentos: un timbre por disco.
 *
 * Nivel 1–2: sintetizadores (Tone.PolySynth).
 * Nivel 3: guitarras grabadas (Tone.Sampler con archivos en public/samples).
 * El cambio es transparente: los dos se tocan con triggerAttackRelease.
 */
import * as Tone from "tone";
import type { InstrumentPreset } from "./types";

// Las claves coinciden con el "id" de cada disc.json de public/discs (los escribe pipeline/)
// y con el instrumento que la interfaz anuncia en src/data/discs.ts.
export const PRESETS: Record<string, InstrumentPreset> = {
  default: {
    id: "default",
    oscillator: "triangle",
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.8 },
    baseOctave: 4,
  },
  // "Fiebre del océano": piano. Ataque seco y caída larga, sin sostener.
  sst: {
    id: "sst",
    oscillator: "fmtriangle",
    envelope: { attack: 0.004, decay: 1.1, sustain: 0.08, release: 1.2 },
    baseOctave: 4,
    volume: -2,
  },
  // "Bruma": armónicos de guitarra. Campanas agudas; cada tipo de partícula tiene su voz.
  aerosols: {
    id: "aerosols",
    oscillator: "amsine",
    envelope: { attack: 0.005, decay: 0.5, sustain: 0.15, release: 1.8 },
    baseOctave: 4,
    volume: -4,
    layers: {
      black_carbon: { oscillator: "fatsawtooth", octaveShift: -1 }, // humo: grave y áspero
      dust: { oscillator: "amtriangle", octaveShift: 0 }, // polvo: cálido
      sea_salt: { oscillator: "sine", octaveShift: 1 }, // sal marina: limpio y agudo
      sulfate: { oscillator: "amsine", octaveShift: 1 }, // sulfato: campana
    },
  },
  // "Pastoral": guitarra clásica. Pulsada: ataque inmediato, sin sostenido.
  forest: {
    id: "forest",
    oscillator: "fattriangle",
    envelope: { attack: 0.003, decay: 0.6, sustain: 0, release: 0.7 },
    baseOctave: 3,
  },
  // "Respiración": órgano. Notas sostenidas y registro grave; a tensión máxima se ensucia.
  co2: {
    id: "co2",
    oscillator: "fatsquare",
    envelope: { attack: 0.06, decay: 0.1, sustain: 0.9, release: 0.4 },
    baseOctave: 3,
    volume: -12,
    maxDistortion: 0.35,
  },
  // TODO(audio, nivel 3): con las guitarras grabadas en public/samples, agregar a forest:
  // samples: { baseUrl: "samples/classical/", urls: { E2: "E2.mp3", G2: "G2.mp3", ... } }
};

export function presetFor(discId: string): InstrumentPreset {
  return PRESETS[discId] ?? PRESETS.default;
}

type Voice = Tone.PolySynth | Tone.Sampler;

export class Instrument {
  readonly preset: InstrumentPreset;
  private voice: Voice;
  /** Voces por capa (aerosoles). */
  private layerVoices = new Map<string, { voice: Voice; octaveShift: number }>();

  constructor(preset: InstrumentPreset, destination: Tone.InputNode) {
    this.preset = preset;
    this.voice = preset.samples ? createSampler(preset) : createSynth(preset, preset.oscillator);
    this.voice.connect(destination);
    for (const [name, layer] of Object.entries(preset.layers ?? {})) {
      const voice = createSynth(preset, layer.oscillator);
      voice.connect(destination);
      this.layerVoices.set(name, { voice, octaveShift: layer.octaveShift });
    }
  }

  /** true cuando los samples (si hay) terminaron de cargar. */
  get loaded(): boolean {
    return this.voice instanceof Tone.Sampler ? this.voice.loaded : true;
  }

  /**
   * Toca notas MIDI. Si se pasa `layer` y el preset tiene una voz para esa capa,
   * suena con esa voz y su desplazamiento de octava.
   */
  play(midis: number | number[], duration: Tone.Unit.Time, time?: Tone.Unit.Time, velocity = 0.8, layer?: string): void {
    const list = Array.isArray(midis) ? midis : [midis];
    const lv = layer ? this.layerVoices.get(layer) : undefined;
    const voice = lv?.voice ?? this.voice;
    const shift = 12 * (lv?.octaveShift ?? 0);
    const notes = list.map((m) => Tone.Frequency(m + shift, "midi").toNote());
    voice.triggerAttackRelease(notes, duration, time, velocity);
  }

  releaseAll(time?: Tone.Unit.Time): void {
    this.voice.releaseAll(time);
    this.layerVoices.forEach((lv) => lv.voice.releaseAll(time));
  }

  dispose(): void {
    this.voice.dispose();
    this.layerVoices.forEach((lv) => lv.voice.dispose());
    this.layerVoices.clear();
  }
}

function createSynth(preset: InstrumentPreset, oscillator: InstrumentPreset["oscillator"]): Tone.PolySynth {
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: oscillator },
    envelope: preset.envelope,
  } as Tone.SynthOptions);
  synth.maxPolyphony = 48;
  synth.volume.value = preset.volume ?? 0;
  return synth;
}

function createSampler(preset: InstrumentPreset): Tone.Sampler {
  const { baseUrl, urls } = preset.samples!;
  const sampler = new Tone.Sampler({ urls, baseUrl, release: preset.envelope.release });
  sampler.volume.value = preset.volume ?? 0;
  return sampler;
}
