/**
 * Cadena de efectos: distorsión → filtro → paneo → reverb → salida.
 *
 * - Filtro: timbre brillante (abierto) u oscuro (cerrado) según el signo de la anomalía.
 * - Distorsión: crece con |anomalía| (nivel 3, guitarra eléctrica).
 * - Paneo: longitud en modo barrido.
 */
import * as Tone from "tone";
import type { Brightness } from "./types";

const BRIGHT_CUTOFF = 6000;
const DARK_CUTOFF = 900;

export class EffectsChain {
  readonly distortion: Tone.Distortion;
  readonly filter: Tone.Filter;
  readonly panner: Tone.Panner;
  readonly reverb: Tone.Reverb;
  readonly output: Tone.Volume;

  constructor() {
    this.distortion = new Tone.Distortion({ distortion: 0, wet: 0 });
    this.filter = new Tone.Filter({ type: "lowpass", frequency: BRIGHT_CUTOFF });
    this.panner = new Tone.Panner(0);
    this.reverb = new Tone.Reverb({ decay: 3, wet: 0.25 });
    this.output = new Tone.Volume(-6);
    this.distortion.chain(this.filter, this.panner, this.reverb, this.output, Tone.getDestination());
  }

  /** Nodo al que se conectan los instrumentos. */
  get input(): Tone.ToneAudioNode {
    return this.distortion;
  }

  setBrightness(b: Brightness, time?: number): void {
    const target = b === "bright" ? BRIGHT_CUTOFF : DARK_CUTOFF;
    this.filter.frequency.rampTo(target, 0.05, time);
  }

  setPan(pan: number, time?: number): void {
    this.panner.pan.rampTo(pan, 0.05, time);
  }

  /** |anomalía| 0..1 → cantidad de distorsión. Desactivado por defecto (nivel 3). */
  setDistortion(amount: number): void {
    this.distortion.distortion = amount;
    this.distortion.wet.value = amount > 0 ? 1 : 0;
  }

  setVolume(db: number): void {
    this.output.volume.rampTo(db, 0.1);
  }

  dispose(): void {
    this.distortion.dispose();
    this.filter.dispose();
    this.panner.dispose();
    this.reverb.dispose();
    this.output.dispose();
  }
}
