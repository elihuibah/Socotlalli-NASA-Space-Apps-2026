/**
 * Tipos compartidos del motor de audio.
 *
 * Contrato 1 (disc.json) lo define Datos en pipeline/contract.py.
 * Contrato 2 (las seis funciones) lo expone src/audio/index.ts.
 *
 * Convención de índices: index = row * cols + col.
 * row 0 = norte (arriba), col 0 = oeste (izquierda).
 */

// ---------------------------------------------------------------------------
// Contrato 1: el disco
// ---------------------------------------------------------------------------

export interface Grid {
  cols: number;
  rows: number;
}

export interface Frame {
  /** "2024-03" */
  date: string;
  /** Ruta relativa a public/, p. ej. "frames/sst/012.jpg". */
  image: string;
  /** cols*rows valores en [0, 1], fila por fila. */
  values: number[];
  /** cols*rows valores en [-1, 1], fila por fila. */
  anomaly: number[];
  /** Frase descriptiva del fotograma (texto en vivo). */
  text: string;
  /** Solo vistas del globo: celdas con dato en este fotograma (reemplaza a Disc.mask). */
  mask?: number[];
  /** Solo vistas del globo: qué parte del planeta se ve. */
  view?: string;
  /** Solo aerosoles: valor 0..1 de cada tipo de partícula, por celda. */
  layers?: Record<string, number[]>;
}

export interface Disc {
  id: string;
  title: string;
  units: string;
  credit: string;
  grid: Grid;
  frames: Frame[];
  /** Descripción de lo que mide cada celda (opcional). */
  measure?: string;
  /** Rango físico [min, max] al que corresponde 0..1 (opcional). */
  range?: [number, number];
  /** 1 = celda con dato, 0 = sin dato (p. ej. tierra en SST). Opcional. */
  mask?: number[];
  /** Color de acento del disco (lo usa la interfaz). */
  accent?: string;
  /** Nombre legible de cada capa de `layers` (aerosoles). */
  layer_names?: Record<string, string>;
  period?: string;
  /** "globe": cada fotograma es otra vista del globo, no otra fecha. */
  view_mode?: "globe";
}

// ---------------------------------------------------------------------------
// Contrato 2: lo que el motor expone
// ---------------------------------------------------------------------------

export type Mode = "scan" | "region";

/** Lo que el motor avisa por cada nota, para que el frontend la dibuje. */
export interface NoteEvent {
  /** Nota en notación científica, p. ej. "C4". */
  note: string;
  midi: number;
  col: number;
  row: number;
  frameIndex: number;
  /** Valor 0..1 de la celda que produjo la nota. */
  value: number;
  /** Anomalía -1..1 de la celda que produjo la nota. */
  anomaly: number;
  tension: TensionLevel;
  /** Tiempo de Tone.js en que suena (segundos de AudioContext). */
  time: number;
  /** Duración en notación de Tone.js, p. ej. "8n". */
  duration: Subdivision;
  /** Paneo -1 (izquierda/oeste) a 1 (derecha/este). */
  pan: number;
  /** Solo discos con capas: la capa dominante de la celda (p. ej. "dust"). */
  layer?: string;
}

export type NoteCallback = (event: NoteEvent) => void;
export type FrameCallback = (frameIndex: number, frame: Frame) => void;

/** API pública del motor. El frontend nunca toca Tone.js directamente. */
export interface AudioEngineApi {
  loadDisc(disc: Disc): void;
  play(): Promise<void>;
  pause(): void;
  setMode(mode: Mode): void;
  setRegion(col: number, row: number): void;
  /** Devuelve una función para cancelar la suscripción. */
  onNote(callback: NoteCallback): () => void;
}

// ---------------------------------------------------------------------------
// Mapeo imagen → música
// ---------------------------------------------------------------------------

/** Una celda leída del disco, lista para mapearse. */
export interface CellSample {
  col: number;
  row: number;
  frameIndex: number;
  value: number;
  anomaly: number;
  /** Variación respecto a las celdas vecinas, 0..1. */
  neighborVariation: number;
  /** false si la máscara dice que la celda no tiene dato. */
  hasData: boolean;
  /** Solo discos con capas: la capa con más valor en la celda. */
  layer?: string;
}

/**
 * 0 = tríada limpia, 1 = séptimas, 2 = novenas/segundas,
 * 3 = segundas menores y tritonos.
 */
export type TensionLevel = 0 | 1 | 2 | 3;

/** Signo de la anomalía → timbre. */
export type Brightness = "bright" | "dark";

/** Duraciones de Tone.js que usa la densidad rítmica. */
export type Subdivision = "4n" | "8n" | "8t" | "16n";

/** Resultado de aplicar la tabla de mapeo a una celda. */
export interface MusicalParams {
  /** Grado de la escala (0 = tónica), ya con la octava incluida. */
  degree: number;
  midi: number;
  tension: TensionLevel;
  brightness: Brightness;
  subdivision: Subdivision;
  /** -1 (oeste) a 1 (este). */
  pan: number;
  /** Velocidad 0..1. */
  velocity: number;
}

/** Interfaz común de un modo de escucha. */
export interface ListeningMode {
  readonly name: Mode;
  /** Siguiente celda a sonar; avanza el estado interno. */
  next(): CellSample | null;
  /** Fotograma activo. */
  readonly frameIndex: number;
  reset(): void;
  /** Salta al inicio del fotograma dado. */
  seek(frameIndex: number): void;
}

/** Preset de timbre por disco (un timbre por disco, nivel 2). */
export interface InstrumentPreset {
  id: string;
  oscillator:
    | "sine"
    | "triangle"
    | "sawtooth"
    | "square"
    | "fatsawtooth"
    | "fatsquare"
    | "fattriangle"
    | "fmsine"
    | "fmtriangle"
    | "amsine"
    | "amtriangle";
  envelope: { attack: number; decay: number; sustain: number; release: number };
  /** Volumen de la voz en dB (para emparejar discos). */
  volume?: number;
    /** Con grabaciones: qué posiciones suenan juntas según la tensión (índice 0 a 3). */
  mix?: number[][];
  /** Distorsión máxima 0..1 en tensión 3 (nivel 3). 0 o ausente = sin distorsión. */
  maxDistortion?: number;
  /** Una voz por capa (aerosoles): capa -> oscilador y octava propios. */
  layers?: Record<string, { oscillator: InstrumentPreset["oscillator"]; octaveShift: number }>;
  /** Muestras de public/samples para Tone.Sampler (nivel 3). */
  samples?: { baseUrl: string; urls: Record<string, string> };
  /** Instrumentos sintetizados extra que suenan solo en los picos de emoción (se turnan si hay varios). */
  peak?: ("waterphone" | "handpan" | "steeldrum")[];
  /** Steel drum que dobla cada nota grabada a lo largo de toda la canción (mismas notas que suenan). */
  accompany?: "steeldrum";
  /** Octava base del registro. */
  baseOctave: number;
}