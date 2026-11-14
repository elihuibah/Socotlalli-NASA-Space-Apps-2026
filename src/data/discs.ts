// Contrato 1: forma de public/discs/<id>.json, generado por pipeline/build_disc.py.
// Celdas fila por fila: index = row * grid.cols + col (row 0 = norte, col 0 = oeste).

export interface DiscFrame {
  date: string        // "2007-08" o "2020-01-15"
  image: string       // ruta relativa a public/, p. ej. "frames/sst/004.jpg"
  values: number[]    // 512 valores de 0 a 1 dentro de `range`
  anomaly: number[]   // 512 valores de -1 a 1: distancia a lo normal de esa celda
  text: string        // frase para el lector de pantalla
}

export interface Disc {
  id: string
  title: string
  units: string            // "°C", "%"
  measure: string          // qué significa el valor, en una frase
  range: [number, number]  // valor real de values = 0 y values = 1
  credit: string
  grid: { cols: number; rows: number }
  mask: number[]           // 512 valores: 1 = celda con dato, 0 = sin dato (tierra en sst)
  frames: DiscFrame[]
}

export const DISC_IDS = ['sst', 'co2'] as const
export type DiscId = (typeof DISC_IDS)[number]

export async function fetchDisc(id: DiscId): Promise<Disc> {
  const res = await fetch(`/discs/${id}.json`)
  if (!res.ok) throw new Error(`No se pudo cargar el disco ${id}: ${res.status}`)
  return res.json() as Promise<Disc>
}

export function cellIndex(disc: Disc, col: number, row: number): number {
  return row * disc.grid.cols + col
}

// Valor en unidades reales (°C, %) de un valor 0..1.
export function realValue(disc: Disc, value: number): number {
  const [lo, hi] = disc.range
  return lo + value * (hi - lo)
}

export function frameImageUrl(frame: DiscFrame): string {
  return `/${frame.image}`
}
