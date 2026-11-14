/**
 * Motor de audio: une modos, mapeo, armonía, instrumentos y efectos
 * sobre el reloj de Tone.js (Transport).
 */
import * as Tone from "tone";
import { calibrate, DEFAULT_CALIBRATION, normalizedFrameChange, type Calibration } from "./calibration";
import { EffectsChain } from "./effects";
import { Harmony, midiToNote } from "./harmony";
import { Instrument, presetFor } from "./instruments";
import { LEGEND, type LegendContext } from "./legend";
import { mapCell } from "./mapping";
import { RegionMode } from "./modes/region";
import { ScanMode } from "./modes/scan";
import { changeToTempo, rawFrameChange } from "./rhythm";
import type {
  AudioEngineApi,
  Disc,
  FrameCallback,
  ListeningMode,
  Mode,
  NoteCallback,
  NoteEvent,
  Subdivision,
} from "./types";

export class AudioEngine implements AudioEngineApi {
  private disc: Disc | null = null;
  private mode: Mode = "scan";
  private scan: ScanMode | null = null;
  private region: RegionMode | null = null;
  private harmony = new Harmony("majorPentatonic", 60);
  private calibration: Calibration = DEFAULT_CALIBRATION;
  private effects: EffectsChain | null = null;
  private instrument: Instrument | null = null;
  private eventId: number | null = null;
  private lastFrame = -1;
  private noteListeners = new Set<NoteCallback>();
  private frameListeners = new Set<FrameCallback>();

  // -------------------------------------------------------------------------
  // Contrato 2
  // -------------------------------------------------------------------------

  loadDisc(disc: Disc): void {
    this.pause();
    this.disc = disc;
    this.scan = new ScanMode(disc);
    this.region = new RegionMode(disc);
    this.calibration = calibrate(disc);
    this.lastFrame = -1;

    this.ensureEffects();
    this.instrument?.dispose();
    const preset = presetFor(disc.id);
    this.harmony.setRoot(12 * (preset.baseOctave + 1)); // C de la octava base
    this.instrument = new Instrument(preset, this.effects!.input);
  }

  async play(): Promise<void> {
    if (!this.disc) return;
    // El navegador bloquea el audio hasta un gesto del usuario.
    await Tone.start();
    const transport = Tone.getTransport();
    if (this.eventId === null) this.scheduleNext(transport.seconds);
    transport.start();
  }

  pause(): void {
    const transport = Tone.getTransport();
    transport.pause();
    if (this.eventId !== null) {
      transport.clear(this.eventId);
      this.eventId = null;
    }
    this.instrument?.releaseAll();
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.activeMode()?.reset();
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

  /** Avisa cuando cambia el fotograma, para el texto en vivo. */
  onFrame(callback: FrameCallback): () => void {
    this.frameListeners.add(callback);
    return () => this.frameListeners.delete(callback);
  }

  /** Cortes calculados para el disco cargado (para depurar). */
  getCalibration(): Calibration {
    return this.calibration;
  }

  /** Toca un ejemplo de la leyenda sonora por id. */
  async playLegend(id: string): Promise<void> {
    const item = LEGEND.find((l) => l.id === id);
    if (!item || !this.instrument || !this.effects) return;
    await Tone.start();
    const ctx: LegendContext = { instrument: this.instrument, effects: this.effects, harmony: this.harmony };
    item.play(ctx, Tone.now() + 0.05);
  }

  dispose(): void {
    this.pause();
    this.instrument?.dispose();
    this.effects?.dispose();
    this.instrument = null;
    this.effects = null;
    this.noteListeners.clear();
    this.frameListeners.clear();
  }

  // -------------------------------------------------------------------------
  // Internos
  // -------------------------------------------------------------------------

  private ensureEffects(): void {
    if (!this.effects) this.effects = new EffectsChain();
  }

  private activeMode(): ListeningMode | null {
    return this.mode === "scan" ? this.scan : this.region;
  }

  /**
   * Programa un solo paso y, al sonar, programa el siguiente.
   * Así cada nota puede tener su propia duración (densidad rítmica).
   */
  private scheduleNext(at: number): void {
    const transport = Tone.getTransport();
    this.eventId = transport.scheduleOnce((time) => {
      const duration = this.step(time);
      this.scheduleNext(at + Tone.Time(duration).toSeconds());
    }, at);
  }

  /** Toca una celda y devuelve cuánto dura el paso. */
  private step(time: number): Subdivision {
    const mode = this.activeMode();
    if (!this.disc || !mode || !this.instrument || !this.effects) return "4n";

    const sample = mode.next();
    this.handleFrameChange(sample?.frameIndex ?? mode.frameIndex);
    if (!sample) return "8n"; // celda sin dato: silencio breve

    const params = mapCell(sample, this.disc, this.harmony, this.calibration, {
      useLatLon: this.mode === "scan",
    });
    const notes = this.harmony.chord(params.midi, params.tension).map(midiToNote);

    this.effects.setBrightness(params.brightness, time);
    this.effects.setPan(params.pan, time);
    this.instrument.play(notes, params.subdivision, time, params.velocity);

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
    };
    // Sincroniza el aviso visual con el momento en que suena.
    Tone.getDraw().schedule(() => this.noteListeners.forEach((cb) => cb(event)), time);

    return params.subdivision;
  }

  private handleFrameChange(frameIndex: number): void {
    if (!this.disc || frameIndex === this.lastFrame) return;
    const prev = this.lastFrame >= 0 ? this.disc.frames[this.lastFrame] : undefined;
    const frame = this.disc.frames[frameIndex];
    const change = normalizedFrameChange(rawFrameChange(prev, frame, this.disc.mask), this.calibration);
    Tone.getTransport().bpm.rampTo(changeToTempo(change), 0.5);
    this.lastFrame = frameIndex;
    Tone.getDraw().schedule(() => this.frameListeners.forEach((cb) => cb(frameIndex, frame)), Tone.now());
  }
}
