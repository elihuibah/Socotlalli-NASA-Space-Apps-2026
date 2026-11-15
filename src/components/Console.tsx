import type { Disc } from '../data/discs'
import { tensionWord } from '../data/discs'
import { IconPause, IconPlay } from './Art'
import { RecordImg, TurntableArmImg, TurntableBoxImg } from './Felt'

/**
 * Tocadiscos de fieltro visto de frente. Es el destino al arrastrar un vinilo
 * y también el botón de pausa. Tres capas: caja, disco (gira) y brazo.
 */
export function Turntable(props: {
  disc: Disc | null
  playing: boolean
  dropState: 'idle' | 'target' | 'over'
  register: (el: HTMLButtonElement | null) => void
  onClick: () => void
}) {
  const { disc, playing, dropState, register, onClick } = props
  const label = disc
    ? `Tocadiscos con ${disc.title}. ${playing ? 'Pausar' : 'Reanudar'}`
    : 'Tocadiscos vacío. Elige un vinilo'
  return (
    <button type="button" className={`tornamesa is-${dropState}`} ref={register} onClick={onClick} aria-label={label}>
      <TurntableBoxImg />

      <svg className="tt-aro" viewBox="0 0 320 250" aria-hidden="true" focusable="false">
        <ellipse cx="140" cy="113" rx="120" ry="31" fill="none" stroke="#F4E2A4" strokeWidth="3.5" strokeDasharray="9 8" strokeLinecap="round" />
      </svg>

      {disc && (
        <span className="tt-disco" aria-hidden="true">
          <RecordImg id={disc.id} className={`tt-giro${playing ? ' is-spinning' : ''}`} />
        </span>
      )}

      <TurntableArmImg down={disc !== null} />
    </button>
  )
}

/** Lo que suena ahora, escrito en el cajón del buró. */
export function NowPlaying(props: {
  disc: Disc | null
  playing: boolean
  frame: number
  onToggle: () => void
  onEject: () => void
  onLearn: (d: Disc) => void
}) {
  const { disc, playing, frame } = props
  if (!disc) {
    return (
      <div className="suena">
        <p className="eyebrow">Tocadiscos</p>
        <p className="suena-titulo">Vacío</p>
        <p className="suena-detalle">Arrastra aquí un vinilo, o elige uno y pulsa «Poner este disco».</p>
      </div>
    )
  }
  return (
    <div className="suena">
      <div className="suena-texto">
        <p className="eyebrow">{playing ? 'Ahora suena' : 'En pausa'}</p>
        <p className="suena-titulo">{disc.title}</p>
        <p className="suena-detalle">
          Fotograma {frame + 1} de {disc.frames.length} · tensión {tensionWord(disc.frames[frame].anomaly)}
        </p>
      </div>
      <div className="suena-acciones">
        <button type="button" className="btn-redondo fieltro cosido" onClick={props.onToggle} aria-label={playing ? 'Pausar' : 'Reanudar'}>
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <button type="button" className="btn-texto btn-conocer" onClick={() => props.onLearn(disc)}>
          Conocer más <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="btn-texto" onClick={props.onEject}>
          Guardar el disco
        </button>
      </div>
    </div>
  )
}
