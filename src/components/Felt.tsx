// Piezas de fieltro ya "horneadas": imágenes con la textura, el borde afelpado y el
// volumen incluidos. Al ser imágenes, moverlas o girarlas no le cuesta nada al navegador.
// La fuente vectorial de cada una está en components/Art.tsx y assets/tlalli.svg.
import { useEffect, useRef, useState } from 'react'
import type { DiscId } from '../data/discs'
import { useT } from '../i18n'
import discoFire from '../assets/fieltro/disco-fire.webp'
import discoGiss from '../assets/fieltro/disco-giss.webp'
import discoRain from '../assets/fieltro/disco-rain.webp'
import discoSeaIce from '../assets/fieltro/disco-seaice.webp'
import discoCo2 from '../assets/fieltro/disco-co2.webp'
import discoIce from '../assets/fieltro/disco-ice.webp'
import discoSst from '../assets/fieltro/disco-sst.webp'
import discoVeg from '../assets/fieltro/disco-veg.webp'
import fundaFire from '../assets/fieltro/funda-fire.webp'
import fundaGiss from '../assets/fieltro/funda-giss.webp'
import fundaRain from '../assets/fieltro/funda-rain.webp'
import fundaSeaIce from '../assets/fieltro/funda-seaice.webp'
import fundaCo2 from '../assets/fieltro/funda-co2.webp'
import fundaIce from '../assets/fieltro/funda-ice.webp'
import fundaSst from '../assets/fieltro/funda-sst.webp'
import fundaVeg from '../assets/fieltro/funda-veg.webp'
import tlalliCuerpo from '../assets/fieltro/tlalli-cuerpo.webp'
import tlalliOjos from '../assets/fieltro/tlalli-ojos.webp'
import tlalliPupilas from '../assets/fieltro/tlalli-pupilas.webp'
import tlalliRisa from '../assets/fieltro/tlalli-risa.webp'
import ttBrazo from '../assets/fieltro/tt-brazo.webp'
import ttCaja from '../assets/fieltro/tt-caja.webp'

// Aerosoles usa por ahora el arte de hielo y bosques el de vegetación (ver `art` en data/discs.ts).
// Hielo marino («Cristal»), incendios («Brasas») y temperatura global («Siglo de calor») tienen carátula propia;
// lluvia es la del mar con el tono girado (provisional).
const FUNDAS: Record<DiscId, string> = { sst: fundaSst, aerosols: fundaIce, forest: fundaVeg, co2: fundaCo2, ice: fundaSeaIce, rain: fundaRain, fire: fundaFire, giss: fundaGiss }
const DISCOS: Record<DiscId, string> = { sst: discoSst, aerosols: discoIce, forest: discoVeg, co2: discoCo2, ice: discoSeaIce, rain: discoRain, fire: discoFire, giss: discoGiss }

// Todas son decorativas: el nombre accesible lo da el botón o la región que las contiene.
const img = { alt: '', draggable: false, decoding: 'async' } as const

export const CoverImg = ({ id }: { id: DiscId }) => <img {...img} className="funda-arte" src={FUNDAS[id]} />
export const RecordImg = ({ id, className }: { id: DiscId; className?: string }) => (
  <img {...img} className={className} src={DISCOS[id]} />
)
export const TurntableBoxImg = () => <img {...img} className="tt-caja" src={ttCaja} />
export const TurntableArmImg = ({ down }: { down: boolean }) => (
  <img {...img} className={`tt-brazo${down ? ' is-down' : ''}`} src={ttBrazo} />
)

/** Tlalli sin interacción, para el telón de entrada: mismas capas y parpadeo. */
export const TlalliTelonImg = () => (
  <div className="tlalli-fig">
    <span className="tlalli-capa">
      <img {...img} className="tlalli-cuerpo" src={tlalliCuerpo} />
      <span className="tlalli-mirada">
        <span className="tlalli-parpado">
          <img {...img} className="tlalli-ojos" src={tlalliOjos} />
          <img {...img} className="tlalli-pupilas" src={tlalliPupilas} />
        </span>
      </span>
    </span>
  </div>
)

type Walk = 'derecha' | 'izquierda' | null

/**
 * Tlalli: cuerpo, ojos y pupilas en capas separadas para que pueda parpadear y mirar.
 * - Sus pupilas siguen al cursor por momentos y vuelven al centro si el cursor se queda quieto.
 * - Un clic la hace rebotar; tres clics seguidos la hacen reír.
 * - Al caminar le salen pies; al llegar (`landing`) los guarda con una animación.
 */
export function TlalliImg(props: {
  listening: boolean
  walking?: Walk
  landing?: boolean
  still?: boolean // reducir movimiento: sin mirada ni risa animada
  onLaugh?: () => void
}) {
  const { listening, walking = null, landing = false, still = false, onLaugh } = props
  const fig = useRef<HTMLButtonElement | null>(null)
  const clicks = useRef<number[]>([])
  const timer = useRef<number | undefined>(undefined)
  const [mood, setMood] = useState<'normal' | 'toque' | 'risa'>('normal')
  const t = useT()

  // La mirada: se mueve con variables CSS, sin volver a dibujar el componente.
  useEffect(() => {
    const el = fig.current
    if (!el || still) return
    let frame = 0
    let rest = 0
    const look = (x: number, y: number) => {
      el.style.setProperty('--mira-x', x.toFixed(3))
      el.style.setProperty('--mira-y', y.toFixed(3))
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2)
        const dy = e.clientY - (r.top + r.height * 0.54)
        const dist = Math.hypot(dx, dy) || 1
        const reach = Math.min(1, dist / (r.width * 0.9)) // cerca mira poco; lejos, hasta el tope
        look((dx / dist) * reach, (dy / dist) * reach)
      })
      window.clearTimeout(rest)
      rest = window.setTimeout(() => look(0, 0), 2600)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
      window.clearTimeout(rest)
      look(0, 0)
    }
  }, [still])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onClick = () => {
    const now = performance.now()
    clicks.current = [...clicks.current.filter((t) => now - t < 1400), now]
    window.clearTimeout(timer.current)
    if (clicks.current.length >= 3) {
      clicks.current = []
      setMood('risa')
      onLaugh?.()
      timer.current = window.setTimeout(() => setMood('normal'), 1700)
    } else {
      setMood('toque')
      timer.current = window.setTimeout(() => setMood('normal'), 420)
    }
  }

  const cls = [
    'tlalli-fig',
    listening && !walking && 'is-listening',
    walking && `is-walking is-${walking}`,
    landing && 'is-landing',
    mood !== 'normal' && `is-${mood}`,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      ref={fig}
      className={cls}
      onClick={onClick}
      aria-label={
        walking
          ? t('Tlalli va caminando', 'Tlalli is walking')
          : t('Tlalli, la Tierra con ojos grandes. Tócala tres veces para hacerla reír', 'Tlalli, the Earth with big eyes. Tap her three times to make her laugh')
      }
    >
      <span className="tlalli-pie is-izq" aria-hidden="true" />
      <span className="tlalli-pie is-der" aria-hidden="true" />
      <span className="tlalli-capa">
        <img {...img} className="tlalli-cuerpo" src={tlalliCuerpo} />
        {/* Ojos (amarillo) y pupilas en capas aparte: al mirar se mueven las pupilas */}
        <span className="tlalli-mirada">
          <span className="tlalli-parpado">
            <img {...img} className="tlalli-ojos" src={tlalliOjos} />
            <img {...img} className="tlalli-pupilas" src={tlalliPupilas} />
          </span>
          <img {...img} className="tlalli-risa" src={tlalliRisa} />
        </span>
      </span>
    </button>
  )
}
