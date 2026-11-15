// El ventanal: una ventana rectangular de la cabaña que da al espacio. Detrás del texto del
// vinilo elegido se ve el cielo, azul oscuro y profundo para que todo se lea bien.
// El cielo acompaña a la música del disco que está en el tocadiscos:
//   - Tinte: un degradado muy leve con un color de la carátula, en la esquina lejos del texto.
//   - Planeta: un planeta de fieltro del color del disco se asoma mientras el disco está puesto.
//   - Destellos: cada nota enciende una estrella en el lugar del mapa que está sonando
//     (oeste a la izquierda, norte arriba), así se ve por dónde va el barrido.
//   - Estrella fugaz: cruza cuando la armonía llega a su tensión máxima (dato lejos de lo normal).
//   - Meteoros: pasan despacio cuando la música entra en una zona muy variada (notas rápidas
//     seguidas) y cuando el mapa cambió mucho respecto a la fecha anterior.
// Todo se mueve solo con transformaciones y opacidad, y nada de esto corre con "Reducir movimiento".
import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import * as audio from '../audio'
import type { Disc, DiscId } from '../data/discs'
import { COLS, ROWS } from '../data/realData'

/** Color con que cada vinilo tiñe el cielo: uno de los colores de su carátula. */
const SKY: Record<DiscId, string> = {
  sst: '#E3A08A', // el sol coral sobre el mar
  aerosols: '#D9CDBD', // polvo color arena
  forest: '#A5C2A7', // salvia de las colinas
  co2: '#C9826B', // terracota
  ice: '#A9D6F0', // hielo
  rain: '#16B7C9', // agua de lluvia
  fire: '#F0642A', // llama
  giss: '#D9421C', // la franja más caliente
}

const DESTELLOS = 10 // estrellas que se turnan para encenderse con las notas
const DESTELLO_CADA_MS = 110 // como mucho, unas nueve por segundo
const FUGAZ_CADA_MS = 5000 // las estrellas fugaces se hacen esperar
const METEORO_CADA_MS = 9000
const NOTAS_RAPIDAS = 4 // notas rápidas seguidas (zona muy variada) para que pase un meteoro
const CAMBIO_FUERTE = 0.45 // cuánto debe cambiar el mapa entre fechas para que pasen meteoros

/** Lanza uno o dos meteoros: entran por la derecha y se desvanecen antes de la mitad,
 *  para no cruzar todo el texto. */
function launchMeteors(box: HTMLElement, count: number) {
  const reach = box.clientWidth * 0.45
  return Array.from(box.querySelectorAll<HTMLElement>('.cielo-meteoro'))
    .slice(0, count)
    .map((el, i) => {
      el.style.top = `${8 + Math.random() * 26 + i * 30}%`
      return el.animate(
        [
          { opacity: 0, transform: 'translateX(0) rotate(0deg)' },
          { opacity: 0.6, offset: 0.15 },
          { opacity: 0.6, offset: 0.7 },
          { opacity: 0, transform: `translateX(${-(reach + 60)}px) rotate(-150deg)` },
        ],
        { duration: 8000 + i * 2500, delay: i * 1400, easing: 'linear' },
      )
    })
}

export function Ventanal(props: {
  disc: Disc | null // el disco que está en el tocadiscos
  playing: boolean
  frame: number
  still: boolean // reducir movimiento
  children: ReactNode
}) {
  const { disc, playing, frame, still, children } = props
  const sky = useRef<HTMLDivElement | null>(null)
  const live = playing && !still && disc !== null

  // Las notas: destellos y, con tensión máxima, una estrella fugaz.
  useEffect(() => {
    const box = sky.current
    if (!live || !box) return
    const stars = Array.from(box.querySelectorAll<HTMLElement>('.cielo-destello'))
    const fugaz = box.querySelector<HTMLElement>('.cielo-fugaz')
    let turn = 0
    let lastStar = 0
    let lastFugaz = performance.now() - FUGAZ_CADA_MS / 2
    let lastMeteor = performance.now() - METEORO_CADA_MS / 2
    let fast = 0
    return audio.onNote((n) => {
      const now = performance.now()
      // Zona muy variada: el motor toca semicorcheas ("16n"). Varias seguidas traen un meteoro.
      fast = n.duration === '16n' ? fast + 1 : 0
      if (fast >= NOTAS_RAPIDAS && now - lastMeteor >= METEORO_CADA_MS) {
        lastMeteor = now
        launchMeteors(box, 1)
      }
      if (now - lastStar >= DESTELLO_CADA_MS) {
        lastStar = now
        const el = stars[turn++ % stars.length]
        el.style.left = `${((n.col + 0.5) / COLS) * 100}%`
        el.style.top = `${((n.row + 0.5) / ROWS) * 100}%`
        el.classList.toggle('is-tensa', n.tension >= 2)
        el.animate(
          [
            { opacity: 0, transform: 'scale(0.3) rotate(0deg)' },
            { opacity: 0.3 + 0.45 * n.value, transform: 'scale(1) rotate(45deg)', offset: 0.3 },
            { opacity: 0, transform: 'scale(0.6) rotate(90deg)' },
          ],
          { duration: 900, easing: 'ease-out' },
        )
      }
      if (n.tension === 3 && fugaz && now - lastFugaz >= FUGAZ_CADA_MS) {
        lastFugaz = now
        // Sale por el rincón de la luna, lejos del texto, y baja un tramo corto hacia la izquierda.
        fugaz.style.left = `${80 + Math.random() * 17}%`
        fugaz.style.top = `${3 + Math.random() * 12}%`
        const trail = fugaz.firstElementChild as HTMLElement
        const reach = Math.min(box.clientWidth * 0.2, 210)
        trail.animate(
          [
            { opacity: 0, transform: 'translateX(0)' },
            { opacity: 0.9, offset: 0.2 },
            { opacity: 0.9, offset: 0.7 },
            { opacity: 0, transform: `translateX(${reach}px)` },
          ],
          { duration: 1300, easing: 'cubic-bezier(0.3, 0, 0.6, 1)' },
        )
      }
    })
  }, [live])

  // Los fotogramas: si el mapa cambió mucho respecto a la fecha anterior, pasan meteoros
  // (uno, o dos si además el mapa es muy variado de un lugar a otro).
  const f = disc?.frames[frame]
  const change = f?.change ?? 0
  const variation = f?.variation ?? 0
  useEffect(() => {
    const box = sky.current
    if (!live || !box || frame === 0 || change < CAMBIO_FUERTE) return
    const anims = launchMeteors(box, variation > 0.5 ? 2 : 1)
    return () => anims.forEach((a) => a.cancel())
  }, [live, frame, change, variation])

  const cls = ['ventanal', 'fieltro', 'cosido', disc && 'con-disco', live && 'is-sonando'].filter(Boolean).join(' ')
  return (
    <div className={cls} style={disc ? ({ '--tinte': SKY[disc.id] } as CSSProperties) : undefined}>
      <div className="ventanal-cielo" ref={sky} aria-hidden="true">
        <span className="cielo-estrellas" />
        <span className="cielo-tinte" />
        <span className="cielo-luna" />
        <span className="cielo-planeta" />
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className="cielo-titila" />
        ))}
        {Array.from({ length: DESTELLOS }, (_, i) => (
          <i key={i} className="cielo-destello" />
        ))}
        <i className="cielo-meteoro" />
        <i className="cielo-meteoro is-chico" />
        <i className="cielo-fugaz">
          <i className="cielo-fugaz-cola" />
        </i>
      </div>
      <div className="ventanal-texto">{children}</div>
    </div>
  )
}
