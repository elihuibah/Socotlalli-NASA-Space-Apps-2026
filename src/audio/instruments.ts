
import * as Tone from "tone";
import type { InstrumentPreset } from "./types";

const SAMPLES = `${import.meta.env.BASE_URL}samples/`;

function noteFiles(notes: string[]): Record<string, string> {
  return Object.fromEntries(notes.map((n) => [n, `${n.replace("#", "s")}.mp3`]));
}

const SAMPLE_NOTES = [
  "E2", "G2", "A#2", "C#3",
  "E3", "G3", "A#3", "C#4",
  "E4", "G4", "A#4", "C#5",
  "E5", "G5", "A#5", "C#6",
];

export const PRESETS: Record<string, InstrumentPreset> = {
  default: {
    id: "default",
    oscillator: "triangle",
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.8 },
    baseOctave: 4,
  },

  // "Fiebre del océano": viento y agua.
  sst: {
    id: "sst",
    oscillator: "sine", // solo si fallan los samples
    envelope: { attack: 0.05, decay: 0.3, sustain: 0.5, release: 1.2 },
    baseOctave: 4,
    samples: { baseUrl: `${SAMPLES}calm/`, urls: noteFiles(SAMPLE_NOTES) },
  },

  // "Bruma": polvo y rayos.
  aerosols: {
    id: "aerosols",
    oscillator: "amsine", // solo si fallan los samples
    envelope: { attack: 0.005, decay: 0.5, sustain: 0.15, release: 2 },
    baseOctave: 4,
    samples: { baseUrl: `${SAMPLES}stress/`, urls: noteFiles(SAMPLE_NOTES) },
  },

  // "Pastoral": viento y agua.
  forest: {
    id: "forest",
    oscillator: "fattriangle", // solo si fallan los samples
    envelope: { attack: 0.003, decay: 0.6, sustain: 0, release: 1.2 },
    baseOctave: 3,
    samples: { baseUrl: `${SAMPLES}calm/`, urls: noteFiles(SAMPLE_NOTES) },
  },

  // "Respiración": polvo y rayos.
  co2: {
    id: "co2",
    oscillator: "fatsquare", // solo si fallan los samples
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.8 },
    baseOctave: 3,
    maxDistortion: 0.5,
    samples: { baseUrl: `${SAMPLES}stress/`, urls: noteFiles(SAMPLE_NOTES) },
  },

  ice: {
    id: "ice",
    oscillator: "amsine",
    envelope: { attack: 0.005, decay: 0.4, sustain: 0.2, release: 1.6 },
    baseOctave: 5,
  },
  vegetation: {
    id: "vegetation",
    oscillator: "fatsawtooth",
    envelope: { attack: 0.08, decay: 0.3, sustain: 0.5, release: 0.9 },
    baseOctave: 3,
  },
};

export function presetFor(discId: string): InstrumentPreset {
  return PRESETS[discId] ?? PRESETS.default;
}

type Voice = Tone.PolySynth | Tone.Sampler;

// Cuántas grabaciones suenan juntas según la tensión (posiciones relativas).
const MIX_OFFSETS: Record<number, number[]> = {
  0: [0],
  1: [0, 4],
  2: [0, 4, 8],
  3: [0, 1, 2],
};

export class Instrument {
  readonly preset: InstrumentPreset;
  private voice: Voice;
  /** Tus grabaciones, ordenadas de grave a agudo. Vacío si el preset no tiene samples. */
  private recorded: { note: string; midi: number }[] = [];

  constructor(preset: InstrumentPreset, destination: Tone.InputNode) {
    this.preset = preset;
    this.voice = preset.samples ? createSampler(preset) : createSynth(preset);
    if (preset.volume !== undefined) this.voice.volume.value = preset.volume;
    this.voice.connect(destination);

    if (preset.samples) {
      this.recorded = Object.keys(preset.samples.urls)
        .map((note) => ({ note, midi: Tone.Frequency(note).toMidi() }))
        .sort((a, b) => a.midi - b.midi);
    }
  }

  get isRaw(): boolean {
    return this.recorded.length > 0;
  }

  pick(value: number, tension: number): string[] {
    const n = this.recorded.length;
    const base = Math.round(Math.min(1, Math.max(0, value)) * (n - 1));
    const offsets = MIX_OFFSETS[tension] ?? [0];
    const picks = new Set(offsets.map((o) => this.recorded[(base + o) % n].note));
    return [...picks];
  }

  /** Toca las grabaciones completas, sin cambiar tono ni cortarlas. */
  playRecordings(notes: string[], time?: Tone.Unit.Time, velocity = 0.8): void {
    (this.voice as Tone.Sampler).triggerAttack(notes, time, velocity);
  }

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
  return new Tone.Sampler({
    urls,
    baseUrl,
    release: preset.envelope.release,
    onload: () => console.log("[sampler] cargado", preset.id),
    onerror: (e) => console.error("[sampler] ERROR", preset.id, e),
  });
}