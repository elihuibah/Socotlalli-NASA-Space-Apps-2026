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
    accompany: ["steeldrum"],
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
    ambience: "static",
    ambienceLevel: 0.25, // muy tenue
  },
  // "Pastoral": viento y agua, agudas. Aire claro y ligero.
  forest: {
    id: "forest",
    oscillator: "fattriangle", // solo si fallan los samples
    envelope: { attack: 0.003, decay: 0.6, sustain: 0, release: 0.7 },
    baseOctave: 3,
    samples: set("calm", HIGH),
    mix: [[0], [0, 2], [0, 2], [0, 2, 4]],
    accompany: ["cello", "guitar"],
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
    ambience: "static",
  },
  // "Hielo marino": frío y espacioso. Pocas notas claras, con waterphone y handpan en los picos.
  ice: {
    id: "ice",
    oscillator: "sine", // solo si fallan los samples
    envelope: { attack: 0.01, decay: 1.4, sustain: 0.05, release: 2.2 },
    baseOctave: 4,
    volume: -2,
    samples: set("calm", HIGH),
    mix: [[0], [0], [0, 2], [0, 2]],
    accompany: ["bells"],
    peak: ["waterphone", "handpan"],
  },
  // "Lluvia": gotas ligeras (pizzicato continuo) y chubascos en los picos.
  rain: {
    id: "rain",
    oscillator: "triangle", // solo si fallan los samples
    envelope: { attack: 0.003, decay: 0.5, sustain: 0, release: 0.8 },
    baseOctave: 4,
    samples: set("calm", HIGH),
    mix: [[0], [0, 2], [0, 2], [0, 2, 4]],
    accompany: ["pizzicato"],
    peak: ["handpan", "waterphone"],
  },
  // "Incendios": tambor que marca cada paso y estática que sube con la tensión.
  fire: {
    id: "fire",
    oscillator: "fatsawtooth", // solo si fallan los samples
    envelope: { attack: 0.005, decay: 0.4, sustain: 0.2, release: 0.6 },
    baseOctave: 4,
    // En Mi menor pentatónica: las grabaciones (E y G) son la tónica y la tercera menor
    rootPitch: 4,
    scale: "minorPentatonic",
    samples: set("calm", HIGH), // la guitarra tranquila: siempre al mismo nivel
    // La guitarra de estrés sube y baja con la tensión igual que la estática (en dB)
    samples2: set("stress", HIGH),
    samples2Db: [-16, -10, -5, 0],
    mix: [[0], [0, 2], [0, 2, 4], [0, 1, 2, 4]],
    ambience: "static",
    // La estática sube y baja con la tensión: casi inaudible en los momentos bajos, clara en los picos.
    ambienceLevels: [0.003, 0.008, 0.045, 0.13],
    accompany: ["drum"],
  },
  // "Temperatura global": arco dramático. Estática que sube con la tensión y waterphone en los años récord.
  giss: {
    id: "giss",
    oscillator: "fatsquare", // solo si fallan los samples
    envelope: { attack: 0.05, decay: 0.2, sustain: 0.8, release: 0.5 },
    baseOctave: 3,
    volume: -2,
    samples: set("stress", LOW),
    mix: [[0], [0, 2], [0, 2, 4], [0, 1, 2, 4]],
    ambience: "static",
    ambienceLevel: 0.5,
    peak: ["waterphone"],
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

/** Voz que dobla las notas grabadas a lo largo de toda la canción. */
export interface Accompaniment {
  note(note: string, duration: Tone.Unit.Time, time: number, velocity?: number): void;
  dispose(): void;
}

/** Pizzicato sintetizado: cuerda pulsada (Karplus-Strong), seca y corta. PluckSynth es monofónico, así que hay un grupo de voces. */
export class Pizzicato implements Accompaniment {
  private voices: Tone.PluckSynth[];
  private reverb: Tone.Reverb;
  private next = 0;

  constructor(destination: Tone.InputNode) {
    this.reverb = new Tone.Reverb({ decay: 1.2, wet: 0.12 });
    this.reverb.connect(destination);
    this.voices = Array.from({ length: 4 }, () => {
      const v = new Tone.PluckSynth({ attackNoise: 1.5, dampening: 3200, resonance: 0.9 });
      v.volume.value = -8;
      v.connect(this.reverb);
      return v;
    });
  }

  note(note: string, _duration: Tone.Unit.Time, time: number, velocity = 0.5): void {
    const v = this.voices[this.next];
    this.next = (this.next + 1) % this.voices.length;
    v.volume.setValueAtTime(-14 + 10 * Math.min(1, velocity), time);
    v.triggerAttack(note, time);
  }

  dispose(): void {
    this.voices.forEach((v) => v.dispose());
    this.reverb.dispose();
  }
}

export function createAccompaniment(name: NonNullable<InstrumentPreset["accompany"]>[number], dest: Tone.InputNode, rootPitch = 0): Accompaniment {
  if (name === "pizzicato") return new Pizzicato(dest);
  if (name === "drum") return new Drum(dest, rootPitch);
  if (name === "bells") return new Bells(dest);
  if (name === "cello") return new Cello(dest);
  if (name === "guitar") return new AcousticGuitar(dest);
  const drum = new SteelDrum(dest);
  drum.setVolume(-4); // acompañando grabaciones a volumen completo: debe oírse por encima
  return drum;
}

/**
 * Estática de radio: siseo continuo de ruido blanco filtrado que sube con la tensión,
 * más chasquidos breves cuando la tensión es alta. Corre aparte de las notas.
 */
export class StaticNoise {
  private noise = new Tone.Noise("white");
  private filter = new Tone.Filter({ type: "bandpass", frequency: 3500, Q: 0.4 });
  private gain = new Tone.Gain(0);
  private running = false;
  private scale: number;
  private levels: number[];
  private static readonly LEVEL = [0.012, 0.03, 0.06, 0.11];

  /** `scale` multiplica todos los niveles (1 = normal, menos = más tenue); `levels` da el nivel de cada tensión. */
  constructor(destination: Tone.InputNode, scale = 1, levels?: number[]) {
    this.scale = scale;
    this.levels = levels ?? StaticNoise.LEVEL;
    this.noise.chain(this.filter, this.gain, destination);
  }

  start(): void {
    if (this.running) return;
    this.noise.start();
    this.running = true;
  }

  stop(): void {
    if (!this.running) return;
    this.gain.gain.cancelScheduledValues(Tone.now());
    this.gain.gain.rampTo(0, 0.2);
    this.noise.stop("+0.25");
    this.running = false;
  }

  /** Ajusta el nivel al paso que suena; con tensión alta añade un chasquido al azar. */
  react(tension: number, time: number): void {
    const level = this.levels[Math.min(3, Math.max(0, tension))] * this.scale;
    this.gain.gain.setTargetAtTime(level, time, 0.15);
    if (tension >= 2 && Math.random() < 0.18 * (tension - 1)) {
      this.filter.frequency.setValueAtTime(1800 + Math.random() * 5000, time);
      this.gain.gain.setValueAtTime(level * 3.5, time + 0.01);
      this.gain.gain.setTargetAtTime(level, time + 0.02, 0.04);
    }
  }

  dispose(): void {
    this.noise.dispose();
    this.filter.dispose();
    this.gain.dispose();
  }
}

/** Campanitas pequeñas: notas agudas y breves que doblan las grabaciones, no todas, para que tintineen. */
export class Bells implements Accompaniment {
  private synth: Tone.PolySynth;
  private reverb: Tone.Reverb;
  private lastTime = -Infinity;

  constructor(destination: Tone.InputNode) {
    this.reverb = new Tone.Reverb({ decay: 3, wet: 0.4 });
    this.synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 5.07, // inarmónico: timbre de campanita metálica
      modulationIndex: 4,
      oscillator: { type: "sine" },
      modulation: { type: "sine" },
      envelope: { attack: 0.002, decay: 1.1, sustain: 0, release: 1.4 },
      modulationEnvelope: { attack: 0.002, decay: 0.4, sustain: 0, release: 0.4 },
    } as never);
    this.synth.volume.value = -16;
    this.synth.chain(this.reverb, destination);
  }

  /** Se llama una vez por nota grabada; las campanitas tocan una nota por paso y no todos los pasos. */
  note(note: string, _duration: Tone.Unit.Time, time: number, velocity = 0.5): void {
    if (time - this.lastTime < 0.001) return;
    this.lastTime = time;
    if (Math.random() < 0.4) return; // hay pasos en silencio
    // misma nota que suena, llevada al registro agudo de las campanitas (E5 a G6)
    let midi = Tone.Frequency(note).toMidi();
    while (midi < 76) midi += 12;
    while (midi > 91) midi -= 12;
    this.synth.triggerAttackRelease(Tone.Frequency(midi, "midi").toNote(), "8n", time + Math.random() * 0.04, Math.min(1, velocity * 0.6));
  }

  dispose(): void {
    this.synth.dispose();
    this.reverb.dispose();
  }
}

/** Violonchelo sintetizado: arco lento, cuerpo cálido y vibrato leve; toca grave y doblando una nota por paso. */
export class Cello implements Accompaniment {
  private synth: Tone.PolySynth;
  private filter: Tone.Filter;
  private vibrato: Tone.Vibrato;
  private reverb: Tone.Reverb;
  private lastTime = -Infinity;

  constructor(destination: Tone.InputNode) {
    this.reverb = new Tone.Reverb({ decay: 2.2, wet: 0.22 });
    this.vibrato = new Tone.Vibrato({ frequency: 5, depth: 0.12 });
    this.filter = new Tone.Filter({ type: "lowpass", frequency: 1500, Q: 0.5 });
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth" }, // cuerda frotada: muchos armónicos, que el filtro redondea
      envelope: { attack: 0.14, decay: 0.2, sustain: 0.8, release: 0.7 },
    } as never);
    this.synth.volume.value = -20;
    this.synth.chain(this.filter, this.vibrato, this.reverb, destination);
  }

  /** Se llama una vez por nota grabada; el violonchelo toca solo la más grave de cada paso. */
  note(note: string, duration: Tone.Unit.Time, time: number, velocity = 0.5): void {
    if (time - this.lastTime < 0.001) return;
    this.lastTime = time;
    // misma nota que suena, llevada al registro del violonchelo (E2 a G3)
    let midi = Tone.Frequency(note).toMidi();
    while (midi > 55) midi -= 12;
    while (midi < 40) midi += 12;
    // el arco dura al menos una negra, para que las notas se liguen
    const len = Math.max(Tone.Time(duration).toSeconds(), Tone.Time("4n").toSeconds());
    this.synth.triggerAttackRelease(Tone.Frequency(midi, "midi").toNote(), len, time, Math.min(1, velocity * 0.7));
  }

  dispose(): void {
    this.synth.dispose();
    this.filter.dispose();
    this.vibrato.dispose();
    this.reverb.dispose();
  }
}

/** Guitarra acústica sintetizada: cuerdas pulsadas (Karplus-Strong) que se rasgan de grave a agudo, con algún paso en silencio. */
export class AcousticGuitar implements Accompaniment {
  private voices: Tone.PluckSynth[];
  private reverb: Tone.Reverb;
  private next = 0;
  private lastTime = -Infinity;
  private strum = 0;
  private skip = false;

  constructor(destination: Tone.InputNode) {
    this.reverb = new Tone.Reverb({ decay: 1.8, wet: 0.18 });
    this.reverb.connect(destination);
    // PluckSynth es monofónico: seis voces, una por cuerda
    this.voices = Array.from({ length: 6 }, () => {
      const v = new Tone.PluckSynth({ attackNoise: 0.9, dampening: 2600, resonance: 0.97 });
      v.volume.value = -12;
      v.connect(this.reverb);
      return v;
    });
  }

  /** Se llama una vez por nota grabada; las de un mismo paso se rasgan con unos milisegundos de diferencia. */
  note(note: string, _duration: Tone.Unit.Time, time: number, velocity = 0.5): void {
    if (time - this.lastTime >= 0.001) {
      this.lastTime = time;
      this.strum = 0;
      this.skip = Math.random() < 0.25; // hay pasos sin guitarra
    }
    if (this.skip) return;
    // misma nota que suena, llevada al registro de la guitarra (E3 a G4)
    let midi = Tone.Frequency(note).toMidi();
    while (midi > 67) midi -= 12;
    while (midi < 52) midi += 12;
    const v = this.voices[this.next];
    this.next = (this.next + 1) % this.voices.length;
    const at = time + this.strum++ * 0.025;
    v.volume.setValueAtTime(-18 + 8 * Math.min(1, velocity), at);
    v.triggerAttack(Tone.Frequency(midi, "midi").toNote(), at);
  }

  dispose(): void {
    this.voices.forEach((v) => v.dispose());
    this.reverb.dispose();
  }
}

/** Tambor de acompañamiento: un golpe por paso, que alterna grave y un poco más agudo. */
export class Drum implements Accompaniment {
  private synth: Tone.MembraneSynth;
  private lastTime = -Infinity;
  private beat = 0;

  /** `rootPitch`: clase de nota de la tónica (0 = C); el tambor marca la tónica y la quinta. */
  private strongNote: string;
  private weakNote: string;

  constructor(destination: Tone.InputNode, rootPitch = 0) {
    this.strongNote = Tone.Frequency(24 + rootPitch, "midi").toNote(); // tónica, octava 1
    this.weakNote = Tone.Frequency(31 + rootPitch, "midi").toNote(); // quinta, encima
    this.synth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.2 },
    });
    this.synth.volume.value = -9;
    this.synth.connect(destination);
  }

  /** Se llama una vez por nota grabada; el tambor solo suena una vez por paso. */
  note(_note: string, _duration: Tone.Unit.Time, time: number, velocity = 0.5): void {
    if (time - this.lastTime < 0.001) return;
    this.lastTime = time;
    const strong = this.beat++ % 2 === 0;
    this.synth.triggerAttackRelease(strong ? this.strongNote : this.weakNote, "16n", time, Math.min(1, velocity * (strong ? 0.9 : 0.55)));
  }

  dispose(): void {
    this.synth.dispose();
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
export class SteelDrum implements PeakVoice, Accompaniment {
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

  setVolume(db: number): void {
    this.synth.volume.value = db;
  }

  /** Un golpe suelto con la misma nota que suena en la grabación (acompañamiento continuo). */
  note(note: string, duration: Tone.Unit.Time, time: number, velocity = 0.5): void {
    // En registro grave el FM casi no se oye: se sube de octava hasta E4 o más (misma nota, misma armonía).
    let midi = Tone.Frequency(note).toMidi();
    while (midi < 64) midi += 12;
    this.synth.triggerAttackRelease(Tone.Frequency(midi, "midi").toNote(), duration, time, Math.min(1, velocity));
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
  /** Segunda grabación (preset.samples2): su volumen cambia con la tensión. */
  private second: Tone.Sampler | null = null;

  constructor(preset: InstrumentPreset, destination: Tone.InputNode) {
    this.preset = preset;
    this.voice = preset.samples ? createSampler(preset) : createSynth(preset, preset.oscillator);
    this.voice.connect(destination);
    if (preset.samples2) {
      this.second = createSampler(preset, preset.samples2);
      this.second.volume.value = (preset.samples2Db?.[0] ?? 0) + VOLUME_TRIM_DB;
      this.second.connect(destination);
    }
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
  playRecordings(notes: string[], time?: Tone.Unit.Time, velocity = 0.8, tension = 0): void {
    (this.voice as Tone.Sampler).triggerAttack(notes, time, velocity);
    if (this.second) {
      // La segunda grabación toca las mismas notas, con el volumen que le toca a esta tensión
      const db = this.preset.samples2Db?.[tension] ?? 0;
      this.second.volume.rampTo(db + VOLUME_TRIM_DB, 0.15, time);
      this.second.triggerAttack(notes, time, velocity);
    }
  }

  get loaded(): boolean {
    const main = this.voice instanceof Tone.Sampler ? this.voice.loaded : true;
    return main && (this.second?.loaded ?? true);
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
    this.second?.releaseAll(time);
    this.layerVoices.forEach((lv) => lv.voice.releaseAll(time));
  }

  dispose(): void {
    this.voice.dispose();
    this.second?.dispose();
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

function createSampler(preset: InstrumentPreset, samples = preset.samples!): Tone.Sampler {
  const { baseUrl, urls } = samples;
  const sampler = new Tone.Sampler({
    urls,
    baseUrl,
    release: preset.envelope.release,
    onerror: (e) => console.error("[sampler] ERROR", preset.id, e),
  });
  sampler.volume.value = (preset.volume ?? 0) + VOLUME_TRIM_DB;
  return sampler;
}