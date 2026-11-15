import type { Disc } from '../data/discs'
import { tensionWord } from '../data/discs'
import { IconEject, IconPause, IconPlay } from './Art'
import { RecordImg, TurntableArmImg, TurntableBoxImg } from './Felt'
import { useLang, useT } from '../i18n'

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
  const t = useT()
  const label = disc
    ? t(`Tocadiscos con ${disc.title}. ${playing ? 'Pausar' : 'Reanudar'}`, `Turntable with ${disc.title}. ${playing ? 'Pause' : 'Resume'}`)
    : t('Tocadiscos vacío. Elige un vinilo', 'Empty turntable. Choose a record')
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

/** Lo que suena ahora, en el cajón del buró: aquí están la pausa y guardar el disco. */
export function NowPlaying(props: {
  disc: Disc | null
  playing: boolean
  frame: number
  onToggle: () => void
  onEject: () => void
}) {
  const { disc, playing, frame } = props
  const lang = useLang()
  const t = useT()
  if (!disc) {
    return (
      <div className="suena">
        <div className="suena-texto">
          <p className="eyebrow">{t('Tocadiscos', 'Turntable')}</p>
          <p className="suena-titulo">{t('Vacío', 'Empty')}</p>
          <p className="suena-detalle">{t('Arrastra aquí un vinilo, o elige uno y pulsa reproducir.', 'Drag a record here, or choose one and press play.')}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="suena">
      <div className="suena-texto">
        <p className="eyebrow">{playing ? t('Ahora suena', 'Now playing') : t('En pausa', 'Paused')}</p>
        <p className="suena-titulo">{disc.title}</p>
        <p className="suena-detalle">
          {t('Fotograma', 'Frame')} {frame + 1} {t('de', 'of')} {disc.frames.length} · {t('tensión', 'tension')}{' '}
          {tensionWord(disc.frames[frame].anomaly, lang)}
        </p>
      </div>
      <div className="suena-acciones">
        <button
          type="button"
          className="btn-redondo fieltro cosido"
          onClick={props.onToggle}
          aria-label={playing ? t('Pausar', 'Pause') : t('Reanudar', 'Resume')}
          title={playing ? t('Pausar', 'Pause') : t('Reanudar', 'Resume')}
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <button type="button" className="btn-redondo is-chico fieltro cosido" onClick={props.onEject} aria-label={t('Guardar el disco en su funda', 'Put the record back in its sleeve')} title={t('Guardar el disco', 'Put the record away')}>
          <IconEject />
        </button>
      </div>
    </div>
  )
}
