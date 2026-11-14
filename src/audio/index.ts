/**
 * Punto de entrada del motor de audio (Contrato 2).
 *
 * El frontend solo usa estas funciones y nunca importa Tone.js:
 *
 *   loadDisc(disc)
 *   play()            // llamar dentro del clic del botón (Tone.start)
 *   pause()
 *   setMode("scan" | "region")
 *   setRegion(col, row)
 *   onNote(callback)  // devuelve una función para desuscribirse
 */
import { AudioEngine } from "./engine";
import type { Disc, FrameCallback, Mode, NoteCallback } from "./types";

const engine = new AudioEngine();

export const loadDisc = (disc: Disc): void => engine.loadDisc(disc);
export const play = (): Promise<void> => engine.play();
export const pause = (): void => engine.pause();
export const setMode = (mode: Mode): void => engine.setMode(mode);
export const setRegion = (col: number, row: number): void => engine.setRegion(col, row);
export const onNote = (callback: NoteCallback): (() => void) => engine.onNote(callback);

// Extras fuera del contrato mínimo.
export const onFrame = (callback: FrameCallback): (() => void) => engine.onFrame(callback);
export const playLegend = (id: string): Promise<void> => engine.playLegend(id);
export { LEGEND } from "./legend";

export type { Disc, Frame, Mode, NoteEvent, NoteCallback, FrameCallback } from "./types";
