// Los cuatro vinilos de la repisa.
// El id de cada vinilo es el de su disc.json en public/discs/ (lo escribe pipeline/).
// `frames` arranca con datos de EJEMPLO; App los reemplaza con los del disc.json al cargarlo
// (ver audioFrames en realData.ts).

export type DiscId = 'sst' | 'aerosols' | 'forest' | 'co2'

/** Arte de fieltro de cada vinilo (assets/fieltro/funda-*.webp y disco-*.webp). */
export type FeltArt = 'sst' | 'ice' | 'veg' | 'co2'

export interface Frame {
  value: number // 0 a 1: valor medio
  anomaly: number // -1 a 1: distancia a lo normal
  variation: number // 0 a 1: variación entre píxeles vecinos
  change: number // 0 a 1: cambio respecto al fotograma anterior
}

export interface Disc {
  id: DiscId
  art: FeltArt
  opus: number
  title: string
  variable: string
  about: string // "guarda ..." en voz de Tlalli
  instrument: string
  wave: OscillatorType // timbre del sintetizador provisional
  baseMidi: number
  color: string // color de la etiqueta del vinilo
  ink: 'clara' | 'oscura' // color del título sobre la funda
  howItSounds: string
  listen: string // lo que dice Tlalli cuando empieza a sonar
  frames: Frame[]
  real: boolean // true cuando frames ya viene del disc.json
}

export const FRAME_MS = 4500
const TOTAL_FRAMES = 12

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n))

function mockFrames(seed: number, trend: number): Frame[] {
  const r = seeded(seed)
  return Array.from({ length: TOTAL_FRAMES }, (_, i) => {
    const t = i / (TOTAL_FRAMES - 1)
    return {
      value: clamp(0.3 + t * 0.45 * trend + (r() - 0.5) * 0.2),
      anomaly: clamp(t * 1.6 * trend - 0.5 * trend + (r() - 0.5) * 0.35, -1, 1),
      variation: 0.2 + r() * 0.6,
      change: i === 0 ? 0.2 : 0.15 + r() * 0.5,
    }
  })
}

export const DISCS: Disc[] = [
  {
    id: 'sst',
    art: 'sst',
    opus: 1,
    title: 'Fiebre del océano',
    variable: 'Temperatura de la superficie del mar',
    about: 'la temperatura de mis mares',
    instrument: 'Piano',
    wave: 'triangle',
    baseMidi: 57,
    color: '#E3A08A',
    ink: 'clara',
    howItSounds:
      'Cuando el agua se calienta, el piano sube y brilla. Si el mar se aleja de lo normal, la armonía se tensa.',
    listen: 'Mis mares. Si el piano sube, el agua se calienta.',
    frames: mockFrames(11, 1),
    real: false,
  },
  {
    id: 'aerosols',
    art: 'ice', // pendiente: arte de fieltro propio para aerosoles
    opus: 2,
    title: 'Bruma',
    variable: 'Aerosoles: polvo, humo, sal marina y sulfato',
    about: 'el polvo, el humo y la sal que flotan en mi aire',
    instrument: 'Armónicos de guitarra',
    wave: 'sine',
    baseMidi: 69,
    color: '#C19ADC',
    ink: 'oscura',
    howItSounds:
      'Entre más partículas flotan en el aire, más agudas y brillantes las notas. Donde hay mucho más que en el resto del planeta, la armonía se tensa.',
    listen: 'Mi aire con polvo, humo y sal. Notas brillantes, más partículas.',
    frames: mockFrames(29, 0.4),
    real: false,
  },
  {
    id: 'forest',
    art: 'veg',
    opus: 3,
    title: 'Pastoral',
    variable: 'Altura de los bosques',
    about: 'la altura de mis bosques',
    instrument: 'Guitarra clásica',
    wave: 'sawtooth',
    baseMidi: 52,
    color: '#A5C2A7',
    ink: 'oscura',
    howItSounds:
      'Entre más altos los árboles, la guitarra toca más notas y más agudas. Donde el bosque se aleja de lo normal de su región, se tensa.',
    listen: 'Mis bosques. Más notas, árboles más altos.',
    frames: mockFrames(47, 0.6),
    real: false,
  },
  {
    id: 'co2',
    art: 'co2',
    opus: 4,
    title: 'Respiración',
    variable: 'Dióxido de carbono en el aire',
    about: 'el dióxido de carbono de mi aire',
    instrument: 'Órgano',
    wave: 'square',
    baseMidi: 48,
    color: '#C9826B',
    ink: 'clara',
    howItSounds:
      'Con más dióxido de carbono, el órgano baja y sostiene las notas, como una respiración pesada.',
    listen: 'Mi aire. Si el órgano baja y pesa, hay más CO₂.',
    frames: mockFrames(61, 1),
    real: false,
  },
]

export function tensionWord(anomaly: number) {
  const t = Math.abs(anomaly)
  if (t < 0.33) return 'baja'
  if (t < 0.66) return 'media'
  return 'alta'
}
