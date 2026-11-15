import type { KeyboardEvent, PointerEvent } from 'react'
import type { Disc, DiscId } from '../data/discs'
import { IconArrow, IconPlay } from './Art'
import { CoverImg, RecordImg } from './Felt'
import { useT } from '../i18n'

interface Props {
  discs: Disc[]
  selectedId: DiscId | null
  currentId: DiscId | null
  draggingId: DiscId | null
  registerCover: (id: DiscId, el: HTMLButtonElement | null) => void
  onSelect: (id: DiscId) => void
  onDragStart: (e: PointerEvent<HTMLButtonElement>, id: DiscId) => void
  onDragMove: (e: PointerEvent<HTMLButtonElement>) => void
  onDragEnd: (e: PointerEvent<HTMLButtonElement>) => void
  onDragCancel: () => void
}

/** Vinilos por fila en el estante (debe coincidir con .fundas en cabana.css). */
const SHELF_COLS = 4

/** Flechas recorren los vinilos; Enter o Espacio eligen el vinilo. */
function roveFocus(e: KeyboardEvent<HTMLDivElement>) {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
  const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button.funda'))
  const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
  if (i < 0) return
  e.preventDefault()
  const last = buttons.length - 1
  // Los vinilos están en filas de 4 (ver SHELF_COLS): arriba y abajo saltan de fila en la misma columna.
  const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: SHELF_COLS, ArrowUp: -SHELF_COLS }
  const n = e.key === 'Home' ? 0 : e.key === 'End' ? last : i + step[e.key]
  if (n < 0 || n > last) return // arriba de la primera fila o abajo de la última: se queda
  buttons[n].focus()
}

export function Shelf(props: Props) {
  const { discs, selectedId, currentId, draggingId } = props
  const t = useT()
  return (
      <div className="fundas" role="group" aria-label={t('Vinilos', 'Records')} onKeyDown={roveFocus}>
        {discs.map((d) => {
          const playing = d.id === currentId
          const selected = d.id === selectedId
          // Si el disco está en el tocadiscos o en el aire, su funda queda vacía.
          const out = playing || d.id === draggingId
          const cls = ['funda', selected && 'is-selected', d.id === draggingId && 'is-dragging', out && 'is-vacia']
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={d.id}
              type="button"
              className={cls}
              ref={(el) => {
                props.registerCover(d.id, el)
              }}
              aria-pressed={selected}
              aria-label={`Op. ${d.opus}, ${d.title}: ${d.variable}${playing ? t('. Sonando ahora', '. Now playing') : ''}`}
              onClick={() => props.onSelect(d.id)}
              onPointerDown={(e) => props.onDragStart(e, d.id)}
              onPointerMove={props.onDragMove}
              onPointerUp={props.onDragEnd}
              onPointerCancel={props.onDragCancel}
            >
              {!out && (
                <span className="funda-disco">
                  <RecordImg id={d.id} />
                </span>
              )}
              <span className="funda-cara">
                <CoverImg id={d.id} />
                <span className={`funda-texto is-${d.ink}`}>
                  <span className="funda-op">Op. {d.opus}</span>
                  <span className="funda-titulo">{d.title}</span>
                </span>
              </span>
              {playing && <span className="etiqueta-sonando">{t('Sonando', 'Playing')}</span>}
            </button>
          )
        })}
      </div>
  )
}

/**
 * Ficha del vinilo elegido: solo tipografía, sin recuadros.
 * Aquí solo vive lo que es propio del vinilo elegido: ponerlo (▶) o, si ya suena,
 * ir al pizarrón. La pausa y guardar el disco están en el cajón del buró.
 */
export function DiscInfo(props: {
  disc: Disc | null
  isCurrent: boolean
  onPlace: (d: Disc) => void
  onLearn: (d: Disc) => void
}) {
  const { disc, isCurrent } = props
  const t = useT()
  if (!disc) {
    return (
      <div className="ficha">
        <p className="eyebrow">{t('Los vinilos', 'The records')}</p>
        <h2>{t('Ocho vinilos, ocho partes de la Tierra', 'Eight records, eight parts of the Earth')}</h2>
        <p className="ficha-como">
          {t('Haz clic en una funda para conocerla, o arrástrala directo al tocadiscos.', 'Click a sleeve to learn about it, or drag it straight to the turntable.')}
        </p>
      </div>
    )
  }
  return (
    <div className="ficha">
      <p className="eyebrow">
        Op. {disc.opus} · {disc.variable}
      </p>
      <h2>{disc.title}</h2>
      <p className="ficha-como">{disc.howItSounds}</p>
      <div className="ficha-pie">
        {isCurrent ? (
          <button type="button" className="btn-fieltro fieltro cosido btn-conocer" onClick={() => props.onLearn(disc)}>
            {t('Conocer más', 'Learn more')} <IconArrow />
          </button>
        ) : (
          <button
            type="button"
            className="btn-redondo fieltro cosido"
            onClick={() => props.onPlace(disc)}
            aria-label={t(`Reproducir ${disc.title}`, `Play ${disc.title}`)}
            title={t('Reproducir este disco', 'Play this record')}
          >
            <IconPlay />
          </button>
        )}
        <p className="ficha-datos">
          {disc.instrument} · {disc.frames.length}{' '}
          {disc.id === 'forest'
            ? t('vistas del globo', 'views of the globe')
            : disc.frames.length === 1
              ? t('fotograma', 'frame')
              : t('fotogramas', 'frames')}{' '}
          · {disc.real ? t('datos de la NASA', 'NASA data') : t('cargando datos…', 'loading data…')}
        </p>
      </div>
    </div>
  )
}
