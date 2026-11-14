// Los cuatro vinilos de la repisa.
// `frames` son datos de EJEMPLO: el equipo de Datos los reemplaza con los valores de cada disc.json.

export type DiscId = 'sst' | 'ice' | 'veg' | 'co2'

export interface Frame {
  value: number // 0 a 1: valor medio
  anomaly: number // -1 a 1: distancia a lo normal
  variation: number // 0 a 1: variación entre píxeles vecinos
  change: number // 0 a 1: cambio respecto al fotograma anterior
}

export interface Disc {
  id: DiscId
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
    listen: 'Así suenan mis mares. Si el piano sube, el agua se está calentando.',
    frames: mockFrames(11, 1),
  },
  {
    id: 'ice',
    opus: 2,
    title: 'Elegía del hielo',
    variable: 'Extensión del hielo marino',
    about: 'el hielo de mis polos',
    instrument: 'Armónicos de guitarra',
    wave: 'sine',
    baseMidi: 69,
    color: '#F1F1EC',
    ink: 'oscura',
    howItSounds:
      'Con menos hielo quedan menos notas, más agudas y solas. La tensión crece cuando el hielo cae bajo lo normal.',
    listen: 'Este es mi hielo. Fíjate cuando las notas se quedan solas: ahí hay menos.',
    frames: mockFrames(29, -1),
  },
  {
    id: 'veg',
    opus: 3,
    title: 'Pastoral',
    variable: 'Verdor de la vegetación',
    about: 'el verdor de mis bosques y cultivos',
    instrument: 'Guitarra clásica',
    wave: 'sawtooth',
    baseMidi: 52,
    color: '#A5C2A7',
    ink: 'oscura',
    howItSounds:
      'Entre más verde, la guitarra toca más notas y más agudas. La sequía se oye como tensión.',
    listen: 'Mis bosques. Entre más notas toca la guitarra, más verde estoy.',
    frames: mockFrames(47, 0.6),
  },
  {
    id: 'co2',
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
    listen: 'Así respiro. Cuando el órgano baja y pesa, hay más dióxido de carbono en mi aire.',
    frames: mockFrames(61, 1),
  },
]

export function tensionWord(anomaly: number) {
  const t = Math.abs(anomaly)
  if (t < 0.33) return 'baja'
  if (t < 0.66) return 'media'
  return 'alta'
}
