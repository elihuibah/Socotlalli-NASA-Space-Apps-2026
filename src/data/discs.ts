// Los ocho vinilos de la repisa: cuatro arriba y, debajo, cuatro más.
// El id de cada vinilo es el de su disc.json en public/discs/ (lo escribe pipeline/).
// `frames` arranca con datos de EJEMPLO; App los reemplaza con los del disc.json al cargarlo
// (ver audioFrames en realData.ts).

import type { Lang } from '../i18n'

export type DiscId = 'sst' | 'aerosols' | 'forest' | 'co2' | 'ice' | 'rain' | 'fire' | 'giss'

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
  {
    id: 'ice',
    art: 'ice',
    opus: 5,
    title: 'Cristal',
    variable: 'Hielo marino en los polos',
    about: 'el hielo que se forma y se rompe en mis polos',
    instrument: 'Campanitas, waterphone y handpan, claros y fríos',
    wave: 'sine',
    baseMidi: 72,
    color: '#A9D6F0',
    ink: 'oscura',
    howItSounds:
      'Entre más hielo cubre el mar, más notas claras y despacio, con campanitas que tintinean encima. Cuando el hielo se aleja de lo normal del año, entran el waterphone y el handpan y la armonía se tensa.',
    listen: 'Mis polos. Notas frías y espaciadas: donde hay hielo, hay sonido.',
    frames: mockFrames(83, 0.5),
    real: false,
    en: {
      title: 'Crystal',
      variable: 'Sea ice at the poles',
      about: 'the ice that forms and breaks at my poles',
      instrument: 'Little bells, waterphone and handpan, clear and cold',
      howItSounds:
        'The more ice covers the sea, the more clear, slow notes you hear, with little bells chiming on top. When the ice drifts away from the normal of the year, the waterphone and handpan come in and the harmony gets tense.',
      listen: 'My poles. Cold, spaced-out notes: where there is ice, there is sound.',
    },
  },
  {
    id: 'rain',
    art: 'sst',
    opus: 6,
    title: 'Aguacero',
    variable: 'Lluvia en el planeta, mes a mes',
    about: 'dónde y cuánto llueve en mis cielos',
    instrument: 'Gotas de pizzicato, handpan y waterphone',
    wave: 'triangle',
    baseMidi: 69,
    color: '#16B7C9',
    ink: 'clara',
    howItSounds:
      'Cada gota es una nota corta de cuerda pulsada. Donde llueve más, suenan más agudas y se juntan; en los chubascos más fuertes entran el handpan y el waterphone.',
    listen: 'Mis cielos. Gotas ligeras: si se juntan, está lloviendo fuerte.',
    frames: mockFrames(97, 0.5),
    real: false,
    en: {
      title: 'Downpour',
      variable: 'Rain on the planet, month by month',
      about: 'where and how much it rains in my skies',
      instrument: 'Pizzicato drops, handpan and waterphone',
      howItSounds:
        'Each drop is a short plucked-string note. Where it rains more, the notes are higher and bunch together; in the heaviest downpours the handpan and waterphone join in.',
      listen: 'My skies. Light drops: if they bunch together, it is raining hard.',
    },
  },
  {
    id: 'fire',
    art: 'co2',
    opus: 7,
    title: 'Brasas',
    variable: 'Incendios activos, mes a mes de 2008',
    about: 'los incendios que prenden y se apagan en mis tierras',
    instrument: 'Tambor y guitarras, con estática que sube y baja',
    wave: 'sawtooth',
    baseMidi: 60,
    color: '#F0642A',
    ink: 'clara',
    howItSounds:
      'Donde hay más fuego, suenan más grabaciones a la vez, con un tambor que marca cada paso. La estática casi no se oye en los momentos tranquilos y sube en los más tensos, junto con la guitarra de estrés.',
    listen: 'Mis tierras. Un tambor de brasas: si sube la estática, el fuego se aviva.',
    frames: mockFrames(113, 0.7),
    real: false,
    en: {
      title: 'Embers',
      variable: 'Active fires, month by month in 2008',
      about: 'the fires that start and die out across my lands',
      instrument: 'Drum and guitars, with static that rises and falls',
      howItSounds:
        'Where there is more fire, more recordings play at once, with a drum marking every step. The static is barely there in calm moments and rises in the tensest ones, along with the stress guitar.',
      listen: 'My lands. A drum of embers: if the static rises, the fire is flaring up.',
    },
  },
  {
    id: 'giss',
    art: 'ice',
    opus: 8,
    title: 'Siglo de calor',
    variable: 'Temperatura global, de 1885 a 2021',
    about: 'cuánto me he calentado desde 1885',
    instrument: 'Estática y waterphone, graves y tensos',
    wave: 'square',
    baseMidi: 50,
    color: '#D9421C',
    ink: 'clara',
    howItSounds:
      'Empieza tranquilo y se va tensando con los años. Entre más me caliento respecto a 1951 a 1980, más estática se oye; en los años más cálidos entra el waterphone.',
    listen: 'Mi aire, año tras año. Si la tensión sube, me estoy calentando.',
    frames: mockFrames(131, 1),
    real: false,
    en: {
      title: 'A Century of Heat',
      variable: 'Global temperature, 1885 to 2021',
      about: 'how much I have warmed since 1885',
      instrument: 'Static and waterphone, low and tense',
      howItSounds:
        'It starts calm and gets tenser over the years. The more I warm compared with 1951 to 1980, the more static you hear; in the warmest years the waterphone comes in.',
      listen: 'My air, year after year. If the tension rises, I am warming up.',
    },
  },
]

export function tensionWord(anomaly: number, lang: Lang = 'es') {
  const t = Math.abs(anomaly)
  if (t < 0.33) return lang === 'en' ? 'low' : 'baja'
  if (t < 0.66) return lang === 'en' ? 'medium' : 'media'
  return lang === 'en' ? 'high' : 'alta'
}
