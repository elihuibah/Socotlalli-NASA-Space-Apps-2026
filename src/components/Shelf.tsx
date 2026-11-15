import type { KeyboardEvent, PointerEvent } from 'react'
import type { Disc, DiscId } from '../data/discs'
import { CoverImg, RecordImg } from './Felt'

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

/** Flechas recorren los vinilos; Enter o Espacio eligen el vinilo. */
function roveFocus(e: KeyboardEvent<HTMLDivElement>) {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return
  const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button.funda'))
  const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
  if (i < 0) return
  e.preventDefault()
  const last = buttons.length - 1
  const n = e.key === 'Home' ? 0 : e.key === 'End' ? last : e.key === 'ArrowRight' ? (i + 1) % buttons.length : (i + last) % buttons.length
  buttons[n].focus()
}

export function Shelf(props: Props) {
  const { discs, selectedId, currentId, draggingId } = props
  return (
      <div className="fundas" role="group" aria-label="Vinilos" onKeyDown={roveFocus}>
        {discs.map((d) => {
          const playing = d.id === currentId
          const selected = d.id === selectedId
          const cls = ['funda', selected && 'is-selected', d.id === draggingId && 'is-dragging']
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
              aria-label={`Op. ${d.opus}, ${d.title}: ${d.variable}${playing ? '. Sonando ahora' : ''}`}
              onClick={() => props.onSelect(d.id)}
              onPointerDown={(e) => props.onDragStart(e, d.id)}
              onPointerMove={props.onDragMove}
              onPointerUp={props.onDragEnd}
              onPointerCancel={props.onDragCancel}
            >
              <span className="funda-disco">
                <RecordImg id={d.id} />
              </span>
              <span className="funda-cara">
                <CoverImg id={d.id} />
                <span className={`funda-texto is-${d.ink}`}>
                  <span className="funda-op">Op. {d.opus}</span>
                  <span className="funda-titulo">{d.title}</span>
                </span>
              </span>
              {playing && <span className="etiqueta-sonando">Sonando</span>}
            </button>
          )
        })}
      </div>
  )
}

/** Ficha del vinilo elegido: solo tipografía, sin recuadros. */
export function DiscInfo(props: {
  disc: Disc | null
  isCurrent: boolean
  playing: boolean
  onPlace: (d: Disc) => void
  onToggle: () => void
  onLearn: (d: Disc) => void
}) {
  const { disc, isCurrent, playing } = props
  if (!disc) {
    return (
      <div className="ficha">
        <p className="eyebrow">Los vinilos</p>
        <h2>Cuatro vinilos, cuatro partes de la Tierra</h2>
        <p className="ficha-como">Haz clic en una funda para conocerla, o arrástrala directo al tocadiscos.</p>
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
          <button type="button" className="btn-fieltro fieltro cosido" onClick={props.onToggle}>
            {playing ? 'Pausar' : 'Seguir escuchando'}
          </button>
        ) : (
          <button type="button" className="btn-fieltro fieltro cosido" onClick={() => props.onPlace(disc)}>
            Poner este disco
          </button>
        )}
        {isCurrent && (
          <button type="button" className="btn-texto btn-conocer" onClick={() => props.onLearn(disc)}>
            Conocer más <span aria-hidden="true">→</span>
          </button>
        )}
        <p className="ficha-datos">
          {disc.instrument} · {disc.frames.length} {disc.id === 'forest' ? 'vistas del globo' : disc.frames.length === 1 ? 'fotograma' : 'fotogramas'} ·{' '}
          {disc.real ? 'datos de la NASA' : 'cargando datos…'}
        </p>
      </div>
    </div>
  )
}
