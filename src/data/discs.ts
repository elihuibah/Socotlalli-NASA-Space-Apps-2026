// Los cuatro vinilos de la repisa.
// El id de cada vinilo es el de su disc.json en public/discs/ (lo escribe pipeline/).
// `frames` arranca con datos de EJEMPLO; App los reemplaza con los del disc.json al cargarlo
// (ver audioFrames en realData.ts).

import type { Lang } from '../i18n'

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
  en: DiscText // los mismos textos en inglés
}

/** Los textos de un vinilo que cambian con el idioma. */
type DiscText = Pick<Disc, 'title' | 'variable' | 'about' | 'instrument' | 'howItSounds' | 'listen'>

/** El vinilo con sus textos en el idioma pedido. */
export const localizeDisc = (d: Disc, lang: Lang): Disc => (lang === 'en' ? { ...d, ...d.en } : d)

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
    instrument: 'Viento y agua, graves',
    wave: 'triangle',
    baseMidi: 57,
    color: '#E3A08A',
    ink: 'clara',
    howItSounds:
      'Cuando el agua se calienta, suenan grabaciones más agudas. Si el mar se aleja de lo normal, se suman más sonidos y la armonía se tensa.',
    listen: 'Mis mares. Si el sonido sube, el agua se calienta.',
    frames: mockFrames(11, 1),
    real: false,
    en: {
      title: 'Ocean Fever',
      variable: 'Sea surface temperature',
      about: 'the temperature of my seas',
      instrument: 'Wind and water, low',
      howItSounds:
        'When the water warms up, higher recordings play. If the sea drifts away from normal, more sounds join in and the harmony gets tense.',
      listen: 'My seas. If the sound rises, the water is warming.',
    },
  },
  {
    id: 'aerosols',
    art: 'ice', // pendiente: arte de fieltro propio para aerosoles
    opus: 2,
    title: 'Bruma',
    variable: 'Aerosoles: polvo, humo, sal marina y sulfato',
    about: 'el polvo, el humo y la sal que flotan en mi aire',
    instrument: 'Polvo y rayos, agudos y tenues',
    wave: 'sine',
    baseMidi: 69,
    color: '#C19ADC',
    ink: 'oscura',
    howItSounds:
      'Entre más partículas flotan en el aire, más agudos y brillantes los sonidos. Donde hay mucho más que en el resto del planeta, se juntan y la armonía se tensa.',
    listen: 'Mi aire con polvo, humo y sal. Sonidos tenues, más partículas.',
    frames: mockFrames(29, 0.4),
    real: false,
    en: {
      title: 'Haze',
      variable: 'Aerosols: dust, smoke, sea salt and sulfate',
      about: 'the dust, smoke and salt floating in my air',
      instrument: 'Dust and rays, high and faint',
      howItSounds:
        'The more particles float in the air, the higher and brighter the sounds. Where there is much more than in the rest of the planet, they pile up and the harmony gets tense.',
      listen: 'My air with dust, smoke and salt. Faint sounds, more particles.',
    },
  },
  {
    id: 'forest',
    art: 'veg',
    opus: 3,
    title: 'Pastoral',
    variable: 'Altura de los bosques',
    about: 'la altura de mis bosques',
    instrument: 'Viento y agua, agudos',
    wave: 'sawtooth',
    baseMidi: 52,
    color: '#A5C2A7',
    ink: 'oscura',
    howItSounds:
      'Entre más altos los árboles, más agudos y más claros los sonidos del viento y el agua. Donde el bosque se aleja de lo normal de su región, se tensa.',
    listen: 'Mis bosques. Aire claro, árboles más altos.',
    frames: mockFrames(47, 0.6),
    real: false,
    en: {
      title: 'Pastoral',
      variable: 'Forest height',
      about: 'the height of my forests',
      instrument: 'Wind and water, high',
      howItSounds:
        'The taller the trees, the higher and clearer the sounds of wind and water. Where the forest drifts away from what is normal for its region, it gets tense.',
      listen: 'My forests. Clear air, taller trees.',
    },
  },
  {
    id: 'co2',
    art: 'co2',
    opus: 4,
    title: 'Respiración',
    variable: 'Dióxido de carbono en el aire',
    about: 'el dióxido de carbono de mi aire',
    instrument: 'Polvo y rayos, graves y densos',
    wave: 'square',
    baseMidi: 48,
    color: '#C9826B',
    ink: 'clara',
    howItSounds:
      'Con más dióxido de carbono, el sonido se vuelve más pesado y se acumulan más grabaciones a la vez, como una respiración que cuesta.',
    listen: 'Mi aire. Si el sonido se vuelve denso y pesado, hay más CO₂.',
    frames: mockFrames(65, 1),
    real: false,
    en: {
      title: 'Breathing',
      variable: 'Carbon dioxide in the air',
      about: 'the carbon dioxide in my air',
      instrument: 'Dust and rays, low and dense',
      howItSounds:
        'With more carbon dioxide, the sound gets heavier and more recordings pile up at once, like breathing that takes effort.',
      listen: 'My air. If the sound gets dense and heavy, there is more CO₂.',
    },
  },
]

export function tensionWord(anomaly: number, lang: Lang = 'es') {
  const t = Math.abs(anomaly)
  if (t < 0.33) return lang === 'en' ? 'low' : 'baja'
  if (t < 0.66) return lang === 'en' ? 'medium' : 'media'
  return lang === 'en' ? 'high' : 'alta'
}
