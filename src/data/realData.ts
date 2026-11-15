// Datos reales de cada disco: los disc.json que escribe pipeline/ (contrato 1).
// Rejilla de 32x16 celdas, index = row * COLS + col; row 0 es el norte y col 0 el oeste.
// Los nombres de lugar copian pipeline/describe.py para que la app y el texto del pipeline coincidan.
import type { DiscId } from './discs'

export const COLS = 32
export const ROWS = 16

export interface DataFrame {
  date: string
  image: string // relativo a public/
  values: number[] // 0 a 1 dentro de `range`
  anomaly: number[] // -1 a 1: distancia a lo normal
  text: string
  mask?: number[] // solo vistas del globo: celdas con dato en esta vista
  view?: string // solo vistas del globo: qué parte del planeta se ve
  layers?: Record<string, number[]> // solo aerosoles: valor por tipo de partícula
}

export interface DiscData {
  id: DiscId
  title: string
  units: string
  measure: string
  accent: string
  range: [number, number]
  credit: string
  grid: { cols: number; rows: number }
  mask: number[]
  frames: DataFrame[]
  layer_names?: Record<string, string>
  period?: string
  view_mode?: 'globe'
}

export type DataMap = Partial<Record<DiscId, DiscData>>

const cache = new Map<DiscId, Promise<DiscData>>()

export function loadDiscData(id: DiscId): Promise<DiscData> {
  let p = cache.get(id)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}discs/${id}.json`).then((r) => {
      if (!r.ok) throw new Error(`No se pudo leer discs/${id}.json (${r.status})`)
      return r.json() as Promise<DiscData>
    })
    p.catch(() => cache.delete(id)) // si falla, se reintenta la próxima vez
    cache.set(id, p)
  }
  return p
}

export const imageUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`

// ---- Celdas y lugares --------------------------------------------------------
export const idx = (col: number, row: number) => row * COLS + col
export const colRow = (i: number) => ({ col: i % COLS, row: Math.floor(i / COLS) })

export const isGlobe = (d: DiscData) => d.view_mode === 'globe'

/** ¿La celda tiene dato en este fotograma? */
export const hasData = (d: DiscData, frame: number, i: number) => (d.frames[frame].mask ?? d.mask)[i] === 1

/** Valor de 0 a 1 llevado a las unidades reales del disco. */
export const toReal = (d: DiscData, v: number) => d.range[0] + v * (d.range[1] - d.range[0])

export function formatValue(d: DiscData, v: number) {
  if (!d.units) return `${Math.round(v * 100)} %` // aerosoles: intensidad de 0 a 1
  const real = toReal(d, v)
  const digits = d.units === '°C' ? 1 : 0
  return `${real.toFixed(digits)}${d.units === '%' ? ' %' : ` ${d.units}`}`
}

/** Centro de la celda en un mapa equirectangular global. */
export function latLon(col: number, row: number) {
  return { lat: 90 - ((row + 0.5) * 180) / ROWS, lon: -180 + ((col + 0.5) * 360) / COLS }
}

export function coords(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(0)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(0)}°${lon >= 0 ? 'E' : 'O'}`
}

function ocean(lat: number, lon: number) {
  if (lat > 66) return 'el Ártico'
  if (lat < -55) return 'el océano Austral'
  const hemi = lat > 15 ? 'norte' : lat < -15 ? 'sur' : 'ecuatorial'
  if (lon >= 20 && lon < 110 && lat < 30) return 'el Índico' + (hemi === 'ecuatorial' ? '' : ` ${hemi}`)
  if ((lon >= -70 && lon < 20) || (lat > 10 && lon >= -100 && lon < -70)) return `el Atlántico ${hemi}`
  return `el Pacífico ${hemi}`
}

function land(lat: number, lon: number): string | null {
  if (lat < -60) return 'la Antártida'
  if (lat > 66) return 'el Ártico'
  if (lon >= -170 && lon < -50 && lat >= 13) return 'Norteamérica'
  if (lon >= -92 && lon < -77 && lat >= 7 && lat < 13) return 'Centroamérica'
  if (lon >= -82 && lon < -34 && lat < 13) return 'Sudamérica'
  if (lon >= 34 && lon < 60 && lat >= 12 && lat < 42) return 'Medio Oriente'
  if (lon >= -20 && lon < 55 && lat >= -36 && lat < 37) return 'África'
  if (lon >= -25 && lon < 45 && lat >= 36) return 'Europa'
  if (lon >= 110 && lon <= 180 && lat < -10) return 'Oceanía'
  if (lon >= 45 && lon <= 180 && lat >= -10) return 'Asia'
  return null
}

/** Posición en pantalla, para las vistas del globo (no tienen latitud ni longitud). */
export function screenPosition(col: number, row: number) {
  const vert = row < 5 ? 'arriba' : row >= 11 ? 'abajo' : 'al centro'
  const horiz = col < 11 ? 'a la izquierda' : col >= 21 ? 'a la derecha' : ''
  if (vert === 'al centro' && horiz) return `al centro, ${horiz}`
  return `${vert} ${horiz}`.trim()
}

export interface Place {
  name: string // "el Pacífico norte" o "Asia oriental y Oceanía"
  detail: string // "35°N 163°O" o "arriba a la izquierda"
}

/**
 * Nombre de la celda. Como en describe.auto(): si en el disco de temperatura del mar la
 * celda tiene dato, es mar; si no, es tierra. `seaMask` es la máscara de sst.json.
 */
export function placeOf(d: DiscData, frame: number, i: number, seaMask?: number[]): Place {
  const { col, row } = colRow(i)
  if (isGlobe(d)) {
    return { name: d.frames[frame].view ?? 'Esta vista del globo', detail: screenPosition(col, row) }
  }
  const { lat, lon } = latLon(col, row)
  const c = coords(lat, lon)
  const sea = seaMask ? seaMask[i] === 1 : d.id === 'sst'
  if (sea) return { name: capitalize(ocean(lat, lon)), detail: c }
  const name = land(lat, lon)
  return { name: name ? capitalize(name) : `Cerca de ${c}`, detail: name ? c : '' }
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** '2007-08' -> 'Agosto de 2007';  '2020-01-15' -> '15 de enero de 2020'. */
export function dateLabel(date: string) {
  const [y, m, day] = date.split('-')
  const month = MONTHS[Number(m) - 1] ?? m
  return day ? `${Number(day)} de ${month} de ${y}` : `${capitalize(month)} de ${y}`
}

/** Etiqueta del fotograma: fecha o, en el globo, la vista. */
export const frameLabel = (d: DiscData, frame: number) => d.frames[frame].view ?? dateLabel(d.frames[frame].date)

/** Con qué se compara la anomalía de este disco (ver notes.md, "Anomalía"), ya con "de". */
export function normalMeaning(d: DiscData) {
  if (isGlobe(d)) return 'del promedio de esta vista'
  if (d.frames.length === 1) return 'del promedio del planeta'
  return 'de su promedio en todas las fechas'
}

/** "Un poco por encima del promedio del planeta", "cerca de su promedio en todas las fechas"... */
export function compareWords(d: DiscData, a: number) {
  const t = Math.abs(a)
  if (t < 0.12) return `cerca ${normalMeaning(d)}`
  const how = t < 0.4 ? 'un poco' : t < 0.7 ? 'bastante' : 'muy'
  return `${how} ${a > 0 ? 'por encima' : 'por debajo'} ${normalMeaning(d)}`
}

/** Primera frase de `measure`, sin las notas técnicas del pipeline. */
export const shortMeasure = (d: DiscData) => d.measure.split(/;|\. /)[0].replace(/\.$/, '') + '.'

// ---- Resúmenes ---------------------------------------------------------------
export interface MapSummary {
  mean: number
  max: number
  maxIndex: number
  min: number
  minIndex: number
  cells: number
}

export function summarize(d: DiscData, frame: number): MapSummary | null {
  const f = d.frames[frame]
  let sum = 0
  let n = 0
  let max = -Infinity
  let min = Infinity
  let maxIndex = 0
  let minIndex = 0
  f.values.forEach((v, i) => {
    if (!hasData(d, frame, i)) return
    sum += v
    n += 1
    if (v > max) [max, maxIndex] = [v, i]
    if (v < min) [min, minIndex] = [v, i]
  })
  if (n === 0) return null
  return { mean: sum / n, max, maxIndex, min, minIndex, cells: n }
}

// ---- Del disc.json al motor de audio provisional ----------------------------
// El motor provisional solo pide 4 números por fotograma (ver Frame en discs.ts).
export function audioFrames(d: DiscData) {
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
  const cellsOf = (k: number) => d.frames[k].values.map((_, i) => i).filter((i) => hasData(d, k, i))
  // Tensión: qué tan lejos de lo normal está el mapa en promedio (|anomalía|). La anomalía
  // con signo se compensa entre zonas y da ~0, así que se usa la distancia. Se escala por
  // disco: el fotograma más alejado de cada disco suena con tensión alta.
  const distance = d.frames.map((f, k) => mean(cellsOf(k).map((i) => Math.abs(f.anomaly[i]))))
  const top = Math.max(...distance)
  return d.frames.map((f, k) => {
    const cells = cellsOf(k)
    if (cells.length === 0) return { value: 0, anomaly: 0, variation: 0, change: 0 }
    const value = mean(cells.map((i) => f.values[i]))
    const anomaly = d.frames.length > 1 && top > 0 ? (0.9 * distance[k]) / top : Math.min(1, distance[k] * 2)
    // Variación: diferencia media con el vecino del este (con dato).
    const diffs = cells.filter((i) => i % COLS < COLS - 1 && hasData(d, k, i + 1)).map((i) => Math.abs(f.values[i + 1] - f.values[i]))
    const variation = diffs.length ? Math.min(1, mean(diffs) * 6) : 0
    const prev = k > 0 && !isGlobe(d) ? d.frames[k - 1] : null
    const change = prev ? Math.min(1, mean(cells.map((i) => Math.abs(f.values[i] - prev.values[i]))) * 8) : 0.2
    return { value, anomaly, variation, change }
  })
}
