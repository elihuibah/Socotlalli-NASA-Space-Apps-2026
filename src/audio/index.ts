// Contrato 2: las seis funciones que Audio expone. El frontend solo llama a estas
// y nunca toca Tone.js directamente.
//
// ESQUELETO: las funciones existen para que las vistas compilen y se puedan conectar
// desde ya, pero todavía no suenan. La persona de Audio reemplaza el cuerpo de cada
// una con Tone.js, sin cambiar sus nombres ni parámetros.

import type { Disc } from '../data/discs'

export type Mode = 'scan' | 'region'

export interface NoteEvent {
  col: number
  row: number
  frame: number
  time: number  // segundos desde que empezó a sonar
}

type NoteListener = (note: NoteEvent) => void

const listeners = new Set<NoteListener>()
let currentDisc: Disc | null = null
let mode: Mode = 'scan'
let region = { col: 0, row: 0 }

export function loadDisc(disc: Disc): void {
  currentDisc = disc
}

// Importante: llamar a play() dentro del clic del botón. Ahí va Tone.start(), o el
// navegador no deja sonar nada.
export async function play(): Promise<void> {
  if (!currentDisc) return
}

export function pause(): void {}

export function setMode(next: Mode): void {
  mode = next
}

export function setRegion(col: number, row: number): void {
  region = { col, row }
}

// Avisa cada nota para dibujarla. Devuelve una función para dejar de escuchar.
export function onNote(callback: NoteListener): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

// Solo para depurar mientras se integra: estado actual del esqueleto.
export function debugState() {
  return { disc: currentDisc?.id ?? null, mode, region, listeners: listeners.size }
}
