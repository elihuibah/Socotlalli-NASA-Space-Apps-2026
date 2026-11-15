/**
 * Instrumentos: un timbre por disco.
 *
 * Con samples: se tocan las grabaciones de Socoteam tal cual (sin cambiar tono ni efectos).
 * Sin samples: sintetizador (Tone.PolySynth). Solo el timbre por defecto lo usa.
 */
import * as Tone from "tone";
import type { InstrumentPreset } from "./types";

/** -20 % de amplitud (20·log10(0.8) ≈ -1.94 dB). */
const VOLUME_TRIM_DB = -1.94;

const SAMPLES = `${import.meta.env.BASE_URL}samples/`;

/** ["A#2"] -> { "A#2": "As2.mp3" }  ("#" rompe las URL, el archivo usa "s"). */
function noteFiles(notes: string[]): Record<string, string> {
  return Object.fromEntries(notes.map((n) => [n, `${n.replace("#", "s")}.mp3`]));
}

const SAMPLE_NOTES = [
  "E2", "G2", "A#2", "C#3",
  "E3", "G3", "A#3", "C#4",
  "E4", "G4", "A#4", "C#5",
  "E5", "G5", "A#5", "C#6",
];

const LOW = SAMPLE_NOTES.slice(0, 8); // E2 ... C#4 (graves)
const HIGH = SAMPLE_NOTES.slice(8); // E4 ... C#6 (agudas)

/** Un set de grabaciones: carpeta + las notas que usa este disco. */
const set = (dir: string, notes: string[]) => ({
  baseUrl: `${SAMPLES}${dir}/`,
  urls: noteFiles(notes),
});

// Las claves coinciden con el "id" de cada disc.json de public/discs (los escribe pipeline/)
// y con el instrumento que la interfaz anuncia en src/data/discs.ts.
export const PRESETS: Record<string, InstrumentPreset> = {
  default: {
    id: "default",
    oscillator: "triangle",
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.8 },
    baseOctave: 4,
  },
  // "Fiebre del océano": viento y agua, graves. Fluido, de una en una.
  sst: {
    id: "sst",
    oscillator: "fmtriangle", // solo si fallan los samples
    envelope: { attack: 0.004, decay: 1.1, sustain: 0.08, release: 1.2 },
    baseOctave: 4,
    samples: set("calm", LOW),
    mix: [[0], [0, 2], [0, 2], [0, 1, 2]],
    peak: ["waterphone", "handpan"],
  },
  // "Bruma": polvo y rayos, agudas y tenues. Partículas sueltas.
  aerosols: {
    id: "aerosols",
    oscillator: "amsine", // solo si fallan los samples
    envelope: { attack: 0.005, decay: 0.5, sustain: 0.15, release: 1.8 },
    baseOctave: 4,
    volume: -6,
    samples: set("stress", HIGH),
    mix: [[0], [0, 2], [0, 2], [0, 1, 2]],
    peak: ["steeldrum"],
  },
  // "Pastoral": viento y agua, agudas. Aire claro y ligero.
  forest: {
    id: "forest",
    oscillator: "fattriangle", // solo si fallan los samples
    envelope: { attack: 0.003, decay: 0.6, sustain: 0, release: 0.7 },
    baseOctave: 3,
    samples: set("calm", HIGH),
    mix: [[0], [0, 2], [0, 2], [0, 2, 4]],
    accompany: "steeldrum",
  },
  // "Respiración": polvo y rayos, graves y densos. Pesado, se acumula.
  co2: {
    id: "co2",
    oscillator: "fatsquare", // solo si fallan los samples
    envelope: { attack: 0.06, decay: 0.1, sustain: 0.9, release: 0.4 },
    baseOctave: 3,
    volume: -3,
    samples: set("stress", LOW),
    mix: [[0, 2], [0, 2, 4], [0, 2, 4], [0, 1, 2, 4]],
  },
};

export function presetFor(discId: string): InstrumentPreset {
  return PRESETS[discId] ?? PRESETS.default;
}

/**
 * Waterphone sintetizado (no hay grabación): parciales inarmónicos metálicos, vibrato lento,
 * un deslizamiento de tono como el agua moviéndose dentro del instrumento y mucha reverb.
 * Solo suena en los picos de emoción (ver AudioEngine.step) y con enfriamiento, para que sea especial.
 */
export interface PeakVoice {
  ready(time: number): boolean;
  /** Toca el momento de pico. `positive` = anomalía positiva. */
  hit(midi: number, time: number, positive: boolean): void;
  dispose(): void;
}

export class Waterphone implements PeakVoice {
  private synth: Tone.FMSynth;
  private vibrato: Tone.Vibrato;
  private reverb: Tone.Reverb;
  private lastAt = -Infinity;

  /** Segundos mínimos entre dos apariciones. */
  static readonly COOLDOWN = 9;

  constructor(destination: Tone.InputNode) {
    this.reverb = new Tone.Reverb({ decay: 6, wet: 0.65 });
    this.vibrato = new Tone.Vibrato({ frequency: 5.2, depth: 0.3 });
    this.synth = new Tone.FMSynth({
      harmonicity: 2.76, // inarmónico: sonido de metal frotado
      modulationIndex: 6,
      oscillator: { type: "sine" },
      modulation: { type: "triangle" },
      envelope: { attack: 0.9, decay: 0.5, sustain: 0.7, release: 3.5 },
      modulationEnvelope: { attack: 1.2, decay: 0.5, sustain: 0.5, release: 3 },
    });
    this.synth.volume.value = -14;
    this.synth.chain(this.vibrato, this.reverb, destination);
  }

  /** true si ya pasó el enfriamiento. */
  ready(time: number): boolean {
    return time - this.lastAt >= Waterphone.COOLDOWN;
  }

  /** Nota larga que se curva hacia arriba (emoción alta) o abajo, como agua que se mueve. */
  hit(midi: number, time: number, up: boolean): void {
    this.lastAt = time;
    const from = Tone.Frequency(midi + 12, "midi").toFrequency();
    const to = from * Math.pow(2, (up ? 1.5 : -1.5) / 12);
    this.synth.triggerAttack(from, time, 0.7);
    this.synth.frequency.setValueAtTime(from, time + 0.6);
    this.synth.frequency.exponentialRampToValueAtTime(to, time + 3.2);
    this.synth.triggerRelease(time + 3.4);
  }

  dispose(): void {
    this.synth.dispose();
    this.vibrato.dispose();
    this.reverb.dispose();
  }
}

/** Handpan sintetizado: golpes suaves y redondos con 2.º y 3.er parcial, en arpegio. */
export class Handpan implements PeakVoice {
  private synth: Tone.PolySynth;
  private reverb: Tone.Reverb;
  private lastAt = -Infinity;
  static readonly COOLDOWN = 8;

  constructor(destination: Tone.InputNode) {
    this.reverb = new Tone.Reverb({ decay: 3.5, wet: 0.4 });
    this.synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2,
      modulationIndex: 1.4,
      oscillator: { type: "sine" },
      modulation: { type: "sine" },
      envelope: { attack: 0.004, decay: 1.6, sustain: 0, release: 1.6 },
      modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0, release: 0.5 },
    } as never);
    this.synth.volume.value = -10;
    this.synth.chain(this.reverb, destination);
  }

  ready(time: number): boolean {
    return time - this.lastAt >= Handpan.COOLDOWN;
  }

  hit(midi: number, time: number, up: boolean): void {
    this.lastAt = time;
    const steps = up ? [0, 4, 7, 12, 16] : [12, 7, 4, 0, -5];
    steps.forEach((o, i) =>
      this.synth.triggerAttackRelease(Tone.Frequency(midi + o, "midi").toNote(), "2n", time + i * 0.22, 0.75),
    );
  }

  dispose(): void {
    this.synth.dispose();
    this.reverb.dispose();
  }
}

/** Steel drum sintetizado: tono brillante de octava con ataque seco, en redoble rápido. */
export class SteelDrum implements PeakVoice {
  private synth: Tone.PolySynth;
  private reverb: Tone.Reverb;
  private lastAt = -Infinity;
  static readonly COOLDOWN = 7;

  constructor(destination: Tone.InputNode) {
    this.reverb = new Tone.Reverb({ decay: 2, wet: 0.3 });
    this.synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.01,
      modulationIndex: 3,
      oscillator: { type: "sine" },
      modulation: { type: "triangle" },
      envelope: { attack: 0.002, decay: 0.7, sustain: 0, release: 0.7 },
      modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 0.3 },
    } as never);
    this.synth.volume.value = -12;
    this.synth.chain(this.reverb, destination);
  }

  ready(time: number): boolean {
    return time - this.lastAt >= SteelDrum.COOLDOWN;
  }

  /** Un golpe suelto con la misma nota que suena en la grabación (acompañamiento continuo). */
  note(note: string, duration: Tone.Unit.Time, time: number, velocity = 0.5): void {
    this.synth.triggerAttackRelease(note, duration, time, velocity);
  }

  hit(midi: number, time: number, up: boolean): void {
    this.lastAt = time;
    const base = midi + 12;
    const pattern = up ? [0, 4, 7, 4, 7, 12] : [12, 7, 4, 7, 4, 0];
    pattern.forEach((o, i) =>
      this.synth.triggerAttackRelease(Tone.Frequency(base + o, "midi").toNote(), "8n", time + i * 0.11, 0.7),
    );
  }

  dispose(): void {
    this.synth.dispose();
    this.reverb.dispose();
  }
}

export function createPeakVoice(name: NonNullable<InstrumentPreset["peak"]>[number], dest: Tone.InputNode): PeakVoice {
  if (name === "handpan") return new Handpan(dest);
  if (name === "steeldrum") return new SteelDrum(dest);
  return new Waterphone(dest);
}

type Voice = Tone.PolySynth | Tone.Sampler;

// Mezcla por defecto si un preset no define `mix`.
const MIX_OFFSETS: Record<number, number[]> = {
  0: [0],
  1: [0, 4],
  2: [0, 2],
  3: [0, 1, 2],
};

export class Instrument {
  readonly preset: InstrumentPreset;
  private voice: Voice;
  /** Voces por capa (solo presets sintetizados con `layers`). */
  private layerVoices = new Map<string, { voice: Voice; octaveShift: number }>();
  /** Grabaciones del disco, ordenadas de grave a agudo. Vacío si el preset no tiene samples. */
  private recorded: { note: string; midi: number }[] = [];

  constructor(preset: InstrumentPreset, destination: Tone.InputNode) {
    this.preset = preset;
    this.voice = preset.samples ? createSampler(preset) : createSynth(preset, preset.oscillator);
    this.voice.connect(destination);
    for (const [name, layer] of Object.entries(preset.layers ?? {})) {
      const voice = createSynth(preset, layer.oscillator);
      voice.connect(destination);
      this.layerVoices.set(name, { voice, octaveShift: layer.octaveShift });
    }
    if (preset.samples) {
      // Las grabaciones (E, G, A#, C#) forman un acorde disminuido: sonado junto o en
      // secuencia es áspero. Solo se usan E y G (tercera menor + octavas), más suave.
      this.recorded = Object.keys(preset.samples.urls)
        .filter((note) => /^[EG]\d$/.test(note))
        .map((note) => ({ note, midi: Tone.Frequency(note).toMidi() }))
        .sort((a, b) => a.midi - b.midi);
    }
  }

  /** true si este instrumento toca grabaciones tal cual. */
  get isRaw(): boolean {
    return this.recorded.length > 0;
  }

  /** Elige grabaciones según el valor 0..1 de la celda y la tensión. */
  pick(value: number, tension: number): string[] {
    const n = this.recorded.length;
    const base = Math.round(Math.min(1, Math.max(0, value)) * (n - 1));
    const offsets = this.preset.mix?.[tension] ?? MIX_OFFSETS[tension] ?? [0];
    return [...new Set(offsets.map((o) => this.recorded[(base + o) % n].note))];
  }

  /** Toca las grabaciones completas, sin cambiar tono ni cortarlas. */
  playRecordings(notes: string[], time?: Tone.Unit.Time, velocity = 0.8): void {
    (this.voice as Tone.Sampler).triggerAttack(notes, time, velocity);
  }

  get loaded(): boolean {
    return this.voice instanceof Tone.Sampler ? this.voice.loaded : true;
  }

  /**
   * Toca notas MIDI (lo usa la leyenda sonora). Si se pasa `layer` y el preset
   * tiene una voz para esa capa, suena con esa voz y su desplazamiento de octava.
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
  synth.volume.value = (preset.volume ?? 0) + VOLUME_TRIM_DB;
  return synth;
}

function createSampler(preset: InstrumentPreset): Tone.Sampler {
  const { baseUrl, urls } = preset.samples!;
  const sampler = new Tone.Sampler({
    urls,
    baseUrl,
    release: preset.envelope.release,
    onerror: (e) => console.error("[sampler] ERROR", preset.id, e),
  });
  sampler.volume.value = (preset.volume ?? 0) + VOLUME_TRIM_DB;
  return sampler;
}