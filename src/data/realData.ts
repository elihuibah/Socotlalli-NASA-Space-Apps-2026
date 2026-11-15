// Datos reales de cada disco: los disc.json que escribe pipeline/ (contrato 1).
// Rejilla de 32x16 celdas, index = row * COLS + col; row 0 es el norte y col 0 el oeste.
// Los nombres de lugar copian pipeline/describe.py para que la app y el texto del pipeline coincidan.
import type { DiscId } from './discs'
import type { Lang } from '../i18n'

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

/** Un valor en unidades reales, partido en número y unidad ("12.3" y "mm/día"), para poder darles tamaños distintos. */
export function formatValueParts(d: DiscData, v: number): { num: string; unit: string } {
  if (!d.units) return { num: `${Math.round(v * 100)}`, unit: '%' } // aerosoles e incendios: intensidad de 0 a 1
  const real = toReal(d, v)
  const digits = d.units === '°C' || d.units === 'mm/día' ? 1 : 0
  return { num: real.toFixed(digits), unit: d.units }
}

export function formatValue(d: DiscData, v: number) {
  const { num, unit } = formatValueParts(d, v)
  return `${num} ${unit}`
}

/** Centro de la celda en un mapa equirectangular global. */
export function latLon(col: number, row: number) {
  return { lat: 90 - ((row + 0.5) * 180) / ROWS, lon: -180 + ((col + 0.5) * 360) / COLS }
}

export function coords(lat: number, lon: number, lang: Lang = 'es') {
  const west = lang === 'en' ? 'W' : 'O'
  return `${Math.abs(lat).toFixed(0)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(0)}°${lon >= 0 ? 'E' : west}`
}

function ocean(lat: number, lon: number, lang: Lang) {
  if (lang === 'en') return oceanEn(lat, lon)
  if (lat > 66) return 'el Ártico'
  if (lat < -55) return 'el océano Austral'
  const hemi = lat > 15 ? 'norte' : lat < -15 ? 'sur' : 'ecuatorial'
  if (lon >= 20 && lon < 110 && lat < 30) return 'el Índico' + (hemi === 'ecuatorial' ? '' : ` ${hemi}`)
  if ((lon >= -70 && lon < 20) || (lat > 10 && lon >= -100 && lon < -70)) return `el Atlántico ${hemi}`
  return `el Pacífico ${hemi}`
}

/** Las mismas reglas que ocean(), con los nombres en inglés. */
function oceanEn(lat: number, lon: number) {
  if (lat > 66) return 'the Arctic'
  if (lat < -55) return 'the Southern Ocean'
  const hemi = lat > 15 ? 'North ' : lat < -15 ? 'South ' : 'Equatorial '
  if (lon >= 20 && lon < 110 && lat < 30) return `the ${hemi === 'Equatorial ' ? '' : hemi}Indian Ocean`
  if ((lon >= -70 && lon < 20) || (lat > 10 && lon >= -100 && lon < -70)) return `the ${hemi}Atlantic`
  return `the ${hemi}Pacific`
}

function land(lat: number, lon: number, lang: Lang): string | null {
  const en = lang === 'en'
  if (lat < -60) return en ? 'Antarctica' : 'la Antártida'
  if (lat > 66) return en ? 'the Arctic' : 'el Ártico'
  if (lon >= -170 && lon < -50 && lat >= 13) return en ? 'North America' : 'Norteamérica'
  if (lon >= -92 && lon < -77 && lat >= 7 && lat < 13) return en ? 'Central America' : 'Centroamérica'
  if (lon >= -82 && lon < -34 && lat < 13) return en ? 'South America' : 'Sudamérica'
  if (lon >= 34 && lon < 60 && lat >= 12 && lat < 42) return en ? 'the Middle East' : 'Medio Oriente'
  if (lon >= -20 && lon < 55 && lat >= -36 && lat < 37) return en ? 'Africa' : 'África'
  if (lon >= -25 && lon < 45 && lat >= 36) return en ? 'Europe' : 'Europa'
  if (lon >= 110 && lon <= 180 && lat < -10) return en ? 'Oceania' : 'Oceanía'
  if (lon >= 45 && lon <= 180 && lat >= -10) return 'Asia'
  return null
}

/** Posición en pantalla, para las vistas del globo (no tienen latitud ni longitud). */
export function screenPosition(col: number, row: number, lang: Lang = 'es') {
  if (lang === 'en') {
    const vert = row < 5 ? 'top' : row >= 11 ? 'bottom' : 'center'
    const horiz = col < 11 ? 'left' : col >= 21 ? 'right' : ''
    if (vert === 'center' && horiz) return `center ${horiz}`
    return `${vert} ${horiz}`.trim()
  }
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
export function placeOf(d: DiscData, frame: number, i: number, seaMask?: number[], lang: Lang = 'es'): Place {
  const { col, row } = colRow(i)
  if (isGlobe(d)) {
    const fallback = lang === 'en' ? 'This view of the globe' : 'Esta vista del globo'
    return { name: viewName(d.frames[frame].view, lang) ?? fallback, detail: screenPosition(col, row, lang) }
  }
  const { lat, lon } = latLon(col, row)
  const c = coords(lat, lon, lang)
  const sea = seaMask ? seaMask[i] === 1 : d.id === 'sst'
  if (sea) return { name: capitalize(ocean(lat, lon, lang)), detail: c }
  const name = land(lat, lon, lang)
  return { name: name ? capitalize(name) : `${lang === 'en' ? 'Near' : 'Cerca de'} ${c}`, detail: name ? c : '' }
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** '2007-08' -> 'Agosto de 2007';  '2020-01-15' -> '15 de enero de 2020'. En inglés: 'August 2007', 'January 15, 2020'. */
export function dateLabel(date: string, lang: Lang = 'es') {
  if (/^m\d\d$/.test(date)) {
    // mes de un promedio de varios años: m01 .. m12
    const i = Number(date.slice(1)) - 1
    return lang === 'en' ? `${MONTHS_EN[i]}, multi-year average` : `${capitalize(MONTHS[i])}, promedio de varios años`
  }
  if (/^\d{4}$/.test(date)) {
    // promedio móvil de cinco años que termina en este año
    return lang === 'en' ? `Years ${Number(date) - 4} to ${date}` : `Años ${Number(date) - 4} a ${date}`
  }
  const [y, m, day] = date.split('-')
  if (lang === 'en') {
    const monthEn = MONTHS_EN[Number(m) - 1] ?? m
    return day ? `${monthEn} ${Number(day)}, ${y}` : `${monthEn} ${y}`
  }
  const month = MONTHS[Number(m) - 1] ?? m
  return day ? `${Number(day)} de ${month} de ${y}` : `${capitalize(month)} de ${y}`
}

/** Etiqueta del fotograma: fecha o, en el globo, la vista. */
export const frameLabel = (d: DiscData, frame: number, lang: Lang = 'es') =>
  viewName(d.frames[frame].view, lang) ?? dateLabel(d.frames[frame].date, lang)

/** Con qué se compara la anomalía de este disco (ver notes.md, "Anomalía"), ya con "de". */
export function normalMeaning(d: DiscData, lang: Lang = 'es') {
  if (lang === 'en') {
    if (isGlobe(d)) return 'the average of this view'
    if (d.frames.length === 1) return 'the planet’s average'
    return 'its average across all dates'
  }
  if (isGlobe(d)) return 'del promedio de esta vista'
  if (d.frames.length === 1) return 'del promedio del planeta'
  return 'de su promedio en todas las fechas'
}

/** "Un poco por encima del promedio del planeta", "cerca de su promedio en todas las fechas"... */
export function compareWords(d: DiscData, a: number, lang: Lang = 'es') {
  const t = Math.abs(a)
  if (lang === 'en') {
    if (t < 0.12) return `close to ${normalMeaning(d, lang)}`
    const howEn = t < 0.4 ? 'slightly' : t < 0.7 ? 'well' : 'far'
    return `${howEn} ${a > 0 ? 'above' : 'below'} ${normalMeaning(d, lang)}`
  }
  if (t < 0.12) return `cerca ${normalMeaning(d)}`
  const how = t < 0.4 ? 'un poco' : t < 0.7 ? 'bastante' : 'muy'
  return `${how} ${a > 0 ? 'por encima' : 'por debajo'} ${normalMeaning(d)}`
}

/** Primera frase de `measure`, sin las notas técnicas del pipeline. */
export const shortMeasure = (d: DiscData, lang: Lang = 'es') =>
  (lang === 'en' ? DATA_EN[d.id].measure : d.measure.split(/;|\. /)[0].replace(/\.$/, '')) + '.'

// ---- Textos de los disc.json en inglés ----------------------------------------
// Los disc.json (pipeline/) vienen en español; aquí está su versión en inglés.
const DATA_EN: Record<DiscId, { title: string; measure: string; credit: string }> = {
  ice: {
    title: 'Sea ice',
    measure: 'Share of the cell covered by sea ice (concentration above 15 %), one day of each month of 2007',
    credit:
      'NASA Scientific Visualization Studio, Sea Ice over the Arctic and Antarctic designed for Science On a Sphere (SOS) and WMS (data: AMSR-E instrument on the Aqua satellite, 15 % concentration or more; one day of each month of 2007). https://svs.gsfc.nasa.gov/3564',
  },
  rain: {
    title: 'Rain',
    measure: 'Average rainfall of the cell in one day, by month (average of 2001 to 2022)',
    credit:
      'NASA Scientific Visualization Studio, IMERG Monthly Precipitation Climatology (2001 - 2022) (data: NASA IMERG, GPM mission). https://svs.gsfc.nasa.gov/5241',
  },
  fire: {
    title: 'Fires',
    measure: 'Fire activity in the cell (0 to 1): active fire points the satellite detected during the month and how intense they are, relative to the most active month of the record',
    credit:
      'NASA Scientific Visualization Studio, Monthly Active Fires (data: MODIS instrument on the Terra satellite, NASA/GSFC and University of Maryland; month by month, 2008). https://svs.gsfc.nasa.gov/30378',
  },
  giss: {
    title: 'Global temperature',
    measure: 'How much warmer or colder than the 1951 to 1980 average the air near the surface is, five-year moving average',
    credit:
      'NASA Scientific Visualization Studio, Global Temperature Anomalies from 1880 to 2021 (data: NASA GISS, GISTEMP). https://svs.gsfc.nasa.gov/4964',
  },
  sst: {
    title: 'Sea temperature',
    measure: 'Sea surface temperature, cell average',
    credit:
      'NASA Scientific Visualization Studio, Global Sea Surface Currents and Temperature (Greg Shirah, Horace Mitchell, Eric Sokolowsky; ECCO2 data by Hong Zhang and Dimitris Menemenlis, NASA/JPL). https://svs.gsfc.nasa.gov/3912',
  },
  aerosols: {
    title: 'Aerosols',
    measure: 'Aerosol intensity in the cell (0 to 1), adding up the 4 types',
    credit:
      'NASA Scientific Visualization Studio, GEOS Aerosols (2025) (visualization: Joseph V. Ardizzone, Helen-Nicole Kostis; science: Lesley Ott; GEOS-FP 2 km Replay model, August 19, 2025, 20:00 UTC). https://svs.gsfc.nasa.gov/5669',
  },
  forest: {
    title: 'Forest height',
    measure: 'Height of the tallest vegetation in the cell (90th percentile), in meters',
    credit:
      'NASA Scientific Visualization Studio, GEDI Forest Height (visualization: Kel Elkins, Horace Mitchell, Greg Shirah; science: Temilola Fatoyinbo, Atticus Stovall; GEDI L2B RH100 data, April 2019 to April 2020). https://svs.gsfc.nasa.gov/4950',
  },
  co2: {
    title: 'Carbon dioxide',
    measure: 'Share of the cell with near-surface CO2 at 430 ppm or more',
    credit:
      'NASA Scientific Visualization Studio, DYAMOND Global Carbon Dioxide for Science On A Sphere (visualization: AJ Christensen, Greg Shirah, Helen-Nicole Kostis, Mark SubbaRao; science: Lesley Ott, Brad Weir, William Putman, Tomohiro Oda; DYAMOND GEOS-MITgcm model, NASA/GMAO and NASA/JPL). https://svs.gsfc.nasa.gov/5436',
  },
}

const VIEWS_EN: Record<string, string> = {
  'Asia oriental y Oceanía': 'East Asia and Oceania',
  'Asia del sur y el océano Índico': 'South Asia and the Indian Ocean',
  'África oriental y Medio Oriente': 'East Africa and the Middle East',
  'África y Europa': 'Africa and Europe',
  'El Atlántico sur, entre Sudamérica y África': 'The South Atlantic, between South America and Africa',
  Sudamérica: 'South America',
  'Las Américas': 'The Americas',
  'Norteamérica y el Pacífico': 'North America and the Pacific',
}

const LAYERS_EN: Record<string, string> = {
  black_carbon: 'black carbon (wildfire smoke)',
  dust: 'dust',
  sea_salt: 'sea salt',
  sulfate: 'sulfate',
}

/** Nombre de la vista del globo en el idioma pedido (undefined si el fotograma no es una vista). */
export function viewName(view: string | undefined, lang: Lang) {
  if (!view || lang !== 'en') return view
  return VIEWS_EN[view] ?? view
}

export const dataTitle = (d: DiscData, lang: Lang) => (lang === 'en' ? DATA_EN[d.id].title : d.title)
export const dataCredit = (d: DiscData, lang: Lang) => (lang === 'en' ? DATA_EN[d.id].credit : d.credit)
/** Nombre de un tipo de partícula ("el polvo"); en inglés, "dust". */
export const layerName = (d: DiscData, key: string, lang: Lang) =>
  lang === 'en' ? (LAYERS_EN[key] ?? key) : (d.layer_names?.[key] ?? key)

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
