/**
 * Motor de audio: une modos, mapeo, armonía, instrumentos y efectos
 * sobre el reloj de Tone.js (Transport).
 *
 * Recibe el disc.json tal como lo escribe pipeline/build_disc.py (Contrato 1).
 */
import * as Tone from "tone";
import { calibrate, DEFAULT_CALIBRATION, normalizedFrameChange, type Calibration } from "./calibration";
import { EffectsChain } from "./effects";
import { Harmony, midiToNote } from "./harmony";
import { createPeakVoice, Instrument, presetFor, SteelDrum, type PeakVoice } from "./instruments";
import { LEGEND, type LegendContext } from "./legend";
import { mapCell } from "./mapping";
import { RegionMode } from "./modes/region";
import { ScanMode } from "./modes/scan";
import { changeToTempo, rawFrameChange } from "./rhythm";
import type {
  AudioEngineApi,
  Disc,
  FrameCallback,
  InstrumentPreset,
  ListeningMode,
  Mode,
  NoteCallback,
  NoteEvent,
  Subdivision,
} from "./types";

/** Tempo de los discos donde "cambio entre fotogramas" no aplica (globo, una sola imagen): 90 BPM. */
const NEUTRAL_CHANGE = 0.5;

export class AudioEngine implements AudioEngineApi {
  private disc: Disc | null = null;
  private mode: Mode = "scan";
  private scan: ScanMode | null = null;
  private region: RegionMode | null = null;
  private harmony = new Harmony("majorPentatonic", 60);
  private calibration: Calibration = DEFAULT_CALIBRATION;
  private effects: EffectsChain | null = null;
  private instrument: Instrument | null = null;
  private peakVoices: PeakVoice[] = [];
  private peakNext = 0;
  private accompaniment: SteelDrum | null = null;
  private eventId: number | null = null;
  private lastFrame = -1;
  private playing = false;
  /** Sube con cada play() y pause(): descarta un play() que quedó esperando. */
  private playToken = 0;
  private noteListeners = new Set<NoteCallback>();
  private frameListeners = new Set<FrameCallback>();

  // -------------------------------------------------------------------------
  // Contrato 2
  // -------------------------------------------------------------------------

  loadDisc(disc: Disc): void {
    this.pause();
    checkDisc(disc);
    this.disc = disc;
    this.scan = new ScanMode(disc);
    this.region = new RegionMode(disc);
    this.calibration = calibrate(disc);
    this.lastFrame = -1;
    this.setInstrument(presetFor(disc.id));
  }

  async play(): Promise<void> {
    if (!this.disc) return;
    // Si mientras esperamos llega una pausa o se cambia de disco, este play() ya no vale.
    const token = ++this.playToken;
    try {
      // El navegador bloquea el audio hasta un gesto del usuario.
      await Tone.start();
      // Sin esto, las primeras notas con samples no suenan. Si alguna grabación falla,
      // se toca de todos modos con las que sí cargaron.
      await Tone.loaded();
    } catch (e) {
      console.warn("[audio] no cargaron todas las grabaciones", e);
    }
    if (token !== this.playToken || !this.disc) return;
    const transport = Tone.getTransport();
    if (this.eventId === null) {
      // Se programa en ticks (no en segundos): el tempo cambia con cada fotograma y
      // Tone convierte segundos a ticks con el tempo del momento.
      const lead = Tone.Time(0.05).toTicks();
      this.scheduleNext(Math.ceil(transport.ticks + lead));
    }
    transport.start();
    this.playing = true;
  }

  pause(): void {
    this.playToken++;
    const transport = Tone.getTransport();
    transport.pause();
    if (this.eventId !== null) {
      transport.clear(this.eventId);
      this.eventId = null;
    }
    this.instrument?.releaseAll();
    this.playing = false;
  }

  /** Cambia de modo sin perder el fotograma en que va la música. */
  setMode(mode: Mode): void {
    const frame = Math.max(0, this.lastFrame);
    this.mode = mode;
    this.activeMode()?.seek(frame);
    this.lastFrame = -1;
  }

  setRegion(col: number, row: number): void {
    this.region?.setRegion(col, row);
  }

  onNote(callback: NoteCallback): () => void {
    this.noteListeners.add(callback);
    return () => this.noteListeners.delete(callback);
  }

  // -------------------------------------------------------------------------
  // Extras (no forman parte del contrato mínimo)
  // -------------------------------------------------------------------------

  /**
   * Desbloquea el audio. Llamarlo dentro del clic del usuario cuando play()
   * se va a llamar después (p. ej. al terminar una animación).
   */
  async start(): Promise<void> {
    try {
      await Tone.start();
    } catch {
      // Si el navegador rechaza el audio, la interfaz sigue funcionando sin sonido.
    }
  }

  /** Salta al inicio de un fotograma (línea de tiempo del frontend). */
  setFrame(frameIndex: number): void {
    this.activeMode()?.seek(frameIndex);
    this.lastFrame = -1;
  }

  getMode(): Mode {
    return this.mode;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  /** Avisa cuando cambia el fotograma, para el texto en vivo. */
  onFrame(callback: FrameCallback): () => void {
    this.frameListeners.add(callback);
    return () => this.frameListeners.delete(callback);
  }

  /** Cortes calculados para el disco cargado (para depurar). */
  getCalibration(): Calibration {
    return this.calibration;
  }

  /** Toca un ejemplo de la leyenda sonora por id. Sin disco cargado usa el timbre por defecto. */
  async playLegend(id: string): Promise<void> {
    const item = LEGEND.find((l) => l.id === id);
    if (!item) return;
    await this.start();
    if (!this.instrument || !this.effects) this.setInstrument(presetFor("default"));
    const ctx: LegendContext = { instrument: this.instrument!, effects: this.effects!, harmony: this.harmony };
    this.effects!.setDistortion(0);
    item.play(ctx, Tone.now() + 0.05);
  }

  dispose(): void {
    this.pause();
    this.instrument?.dispose();
    this.peakVoices.forEach((v) => v.dispose());
    this.accompaniment?.dispose();
    this.accompaniment = null;
    this.effects?.dispose();
    this.peakVoices = [];
    this.instrument = null;
    this.effects = null;
    this.noteListeners.clear();
    this.frameListeners.clear();
  }

  // -------------------------------------------------------------------------
  // Internos
  // -------------------------------------------------------------------------

  private setInstrument(preset: InstrumentPreset): void {
    if (!this.effects) this.effects = new EffectsChain();
    this.instrument?.dispose();
    this.peakVoices.forEach((v) => v.dispose());
    this.peakVoices = (preset.peak ?? []).map((name) => createPeakVoice(name, Tone.getDestination()));
    this.peakNext = 0;
    this.accompaniment?.dispose();
    this.accompaniment = preset.accompany === "steeldrum" ? new SteelDrum(Tone.getDestination()) : null;
    this.harmony.setRoot(12 * (preset.baseOctave + 1)); // C de la octava base
    // Con grabaciones: salida directa, sin distorsión, filtro, paneo ni reverb.
    const destination = preset.samples ? Tone.getDestination() : this.effects.input;
    this.instrument = new Instrument(preset, destination);
  }

  private activeMode(): ListeningMode | null {
    return this.mode === "scan" ? this.scan : this.region;
  }

  /**
   * Programa un solo paso y, al sonar, programa el siguiente.
   * Así cada nota puede tener su propia duración (densidad rítmica).
   *
   * `atTicks` va en ticks del Transport, no en segundos: el tempo cambia con cada
   * fotograma y, si se sumaran segundos, Tone los convertiría con el tempo nuevo y el
   * siguiente paso podía caer en el pasado (no suena nunca y la música se calla) o
   * muy en el futuro (silencio largo).
   */
  private scheduleNext(atTicks: number): void {
    const transport = Tone.getTransport();
    // En ticks, no en segundos: los segundos se convierten con el BPM del momento, y al
    // bajar el tempo entre fotogramas el siguiente paso quedaba en el pasado (música detenida).
    this.eventId = transport.scheduleOnce((time) => {
      let duration: Subdivision = "4n";
      try {
        duration = this.step(time);
      } catch (e) {
        // Un error en una nota no debe cortar la cadena: se sigue con la siguiente.
        console.error("[audio] error al tocar un paso", e);
      }
      this.scheduleNext(atTicks + Math.round(Tone.Time(duration).toTicks()));
    }, `${atTicks}i`);
  }

  /** Toca una celda y devuelve cuánto dura el paso. */
  private step(time: number): Subdivision {
    const mode = this.activeMode();
    if (!this.disc || !mode || !this.instrument || !this.effects) return "4n";

    const sample = mode.next();
    this.handleFrameChange(sample?.frameIndex ?? mode.frameIndex, time);
    if (!sample) return "8n"; // celda sin dato: silencio breve

    const params = mapCell(sample, this.disc, this.harmony, this.calibration, {
      useLatLon: this.mode === "scan",
    });
    if (this.instrument.isRaw) {
      // Tus grabaciones tal cual: la celda decide cuál suena.
      const picks = this.instrument.pick(sample.value, params.tension);
      this.instrument.playRecordings(picks, time, params.velocity);
      // El steel drum dobla las mismas notas, así siempre queda en armonía con las grabaciones.
      for (const note of picks) this.accompaniment?.note(note, params.subdivision, time, params.velocity * 0.6);
    } else {
      const chord = this.harmony.chord(params.midi, params.tension);
      // Nivel 3: distorsión solo en tensión máxima y solo en los timbres que la piden.
      const maxDist = this.instrument.preset.maxDistortion ?? 0;
      this.effects.setDistortion(params.tension === 3 ? maxDist * Math.abs(sample.anomaly) : 0, time);
      this.effects.setBrightness(params.brightness, time);
      this.effects.setPan(params.pan, time);
      this.instrument.play(chord, params.subdivision, time, params.velocity, sample.layer);
    }

    // Pico de emoción (tensión máxima con anomalía fuerte): entra la voz de pico (waterphone, handpan o steel drum).
    if (this.peakVoices.length && params.tension === 3 && Math.abs(sample.anomaly) > 0.6) {
      // Si hay varias voces de pico, se turnan.
      const n = this.peakVoices.length;
      for (let i = 0; i < n; i++) {
        const voice = this.peakVoices[(this.peakNext + i) % n];
        if (voice.ready(time)) {
          voice.hit(params.midi, time, sample.anomaly > 0);
          this.peakNext = (this.peakNext + i + 1) % n;
          break;
        }
      }
    }

    const event: NoteEvent = {
      note: midiToNote(params.midi),
      midi: params.midi,
      col: sample.col,
      row: sample.row,
      frameIndex: sample.frameIndex,
      value: sample.value,
      anomaly: sample.anomaly,
      tension: params.tension,
      time,
      duration: params.subdivision,
      pan: params.pan,
      layer: sample.layer,
    };
    // Sincroniza el aviso visual con el momento en que suena.
    Tone.getDraw().schedule(() => this.noteListeners.forEach((cb) => cb(event)), time);

    return params.subdivision;
  }

  private handleFrameChange(frameIndex: number, time: number): void {
    const disc = this.disc;
    if (!disc || frameIndex === this.lastFrame) return;
    const frame = disc.frames[frameIndex];
    let change = NEUTRAL_CHANGE;
    // En el globo cada fotograma es otro lugar, no otra fecha: comparar no tiene sentido.
    if (disc.view_mode !== "globe" && disc.frames.length > 1) {
      // Al empezar o tras un salto no hay fotograma anterior: se usa el previo del disco.
      const n = disc.frames.length;
      const prevIndex = this.lastFrame >= 0 ? this.lastFrame : (frameIndex - 1 + n) % n;
      change = normalizedFrameChange(rawFrameChange(disc.frames[prevIndex], frame, disc.mask), this.calibration);
    }
    Tone.getTransport().bpm.rampTo(changeToTempo(change), 0.5);
    this.lastFrame = frameIndex;
    Tone.getDraw().schedule(() => this.frameListeners.forEach((cb) => cb(frameIndex, frame)), time);
  }
}

/** Revisión mínima del contrato 1 (la completa es pipeline/validate.py). */
function checkDisc(disc: Disc): void {
  const cells = disc.grid.cols * disc.grid.rows;
  if (!disc.frames.length) throw new Error(`El disco "${disc.id}" no tiene fotogramas.`);
  disc.frames.forEach((f, i) => {
    if (f.values.length !== cells || f.anomaly.length !== cells) {
      throw new Error(`El disco "${disc.id}", fotograma ${i}: values y anomaly deben tener ${cells} números.`);
    }
  });
}
