import type { Disc } from '../data/discs'
import { tensionWord } from '../data/discs'
import { IconPause, IconPlay } from './Art'

/** Tocadiscos de fieltro. Es el destino al arrastrar un vinilo y también el botón de pausa. */
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
    : 'Tocadiscos vacío. Elige un vinilo de la repisa'
  return (
    <button type="button" className={`tornamesa is-${dropState}`} ref={register} onClick={onClick} aria-label={label}>
      <svg viewBox="0 0 320 206" aria-hidden="true" focusable="false">
        <rect x="6" y="8" width="308" height="190" rx="18" fill="#D9CDBD" />
        <rect x="14" y="16" width="292" height="174" rx="12" fill="none" stroke="#2E221C" strokeOpacity=".35" strokeWidth="2" strokeDasharray="6 6" strokeLinecap="round" />
        <circle className="plato" cx="124" cy="103" r="80" fill="#2E221C" />
        <circle className="plato-aro" cx="124" cy="103" r="86" fill="none" stroke="#F4E2A4" strokeWidth="3" strokeDasharray="8 7" strokeLinecap="round" />
        {disc && (
          <g className={`tt-disco${playing ? ' is-spinning' : ''}`}>
            <circle cx="124" cy="103" r="73" fill="#1E1715" />
            {[64, 55, 46, 37].map((r) => (
              <circle key={r} cx="124" cy="103" r={r} fill="none" stroke="#3A2C26" strokeWidth="1.5" />
            ))}
            <circle cx="124" cy="103" r="25" fill={disc.color} />
            <path d="M124 82 v10" stroke="#2E221C" strokeOpacity=".5" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="124" cy="103" r="3" fill="#1E1715" />
          </g>
        )}
        <circle cx="268" cy="50" r="17" fill="#8A6644" />
        <g className={`tt-brazo${disc ? ' is-down' : ''}`}>
          <path d="M268 50 L222 142" stroke="#B98F63" strokeWidth="8" strokeLinecap="round" />
          <rect x="208" y="134" width="22" height="16" rx="4" fill="#8A6644" transform="rotate(27 219 142)" />
        </g>
        <circle cx="268" cy="50" r="6" fill="#2E221C" />
        <circle cx="268" cy="164" r="9" fill="#F4E2A4" />
        <circle cx="240" cy="164" r="6" fill="#C9826B" />
      </svg>
    </button>
  )
}

/** Lo que suena ahora, escrito junto al tocadiscos. */
export function NowPlaying(props: {
  disc: Disc | null
  playing: boolean
  frame: number
  onToggle: () => void
  onEject: () => void
}) {
  const { disc, playing, frame } = props
  if (!disc) {
    return (
      <div className="suena">
        <p className="eyebrow">Tocadiscos</p>
        <p className="suena-titulo">Vacío</p>
        <p className="suena-detalle">Arrastra aquí un vinilo de la repisa.</p>
      </div>
    )
  }
  return (
    <div className="suena">
      <p className="eyebrow">{playing ? 'Ahora suena' : 'En pausa'}</p>
      <p className="suena-titulo">{disc.title}</p>
      <p className="suena-detalle">
        Fotograma {frame + 1} de {disc.frames.length} · tensión {tensionWord(disc.frames[frame].anomaly)}
      </p>
      <div className="suena-acciones">
        <button type="button" className="btn-redondo cosido" onClick={props.onToggle} aria-label={playing ? 'Pausar' : 'Reanudar'}>
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <button type="button" className="btn-texto" onClick={props.onEject}>
          Guardar el disco
        </button>
      </div>
    </div>
  )
}
