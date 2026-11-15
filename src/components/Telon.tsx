// El telón: primera pantalla de Socotlalli. Una cortina de fieltro tapa toda la cabaña
// (también el encabezado) mientras se cargan las piezas y muestra el avance real.
// Tlalli entra por la derecha y espera sobre el telón; cuando todo está listo, la cortina
// se desliza entera hacia la izquierda y Tlalli va dando saltitos hasta su lugar en la cabaña.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useLoadProgress } from '../hooks/useLoadProgress'
import { TlalliTelonImg } from './Felt'

const PLIEGUES = 12 // tiras verticales de la cortina
const HOLD_MS = 700 // el telón se queda quieto un momento después de cargar
const OPEN_MS = 1250 // lo que tarda en irse el telón y en llegar Tlalli (igual que en telon.css)

type Stage = 'abriendo' | 'fuera'

export function Telon(props: {
  still: boolean // reducir movimiento: el telón desaparece sin deslizarse
  onOpen: () => void // empieza a abrirse: la cabaña ya se puede usar
  onGone: () => void // ya no está: App lo quita de la página
}) {
  const { still, onOpen, onGone } = props
  const { percent, ready } = useLoadProgress()
  const [stage, setStage] = useState<Stage | null>(null)
  const tlalli = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ready) return
    const open = window.setTimeout(() => {
      setStage('abriendo')
      onOpen()
    }, HOLD_MS)
    const gone = window.setTimeout(() => {
      setStage('fuera')
      onGone()
    }, HOLD_MS + (still ? 0 : OPEN_MS))
    return () => {
      window.clearTimeout(open)
      window.clearTimeout(gone)
    }
  }, [ready, still, onOpen, onGone])

  // Al abrirse, Tlalli viaja desde el telón hasta donde está la Tlalli de la cabaña
  // (oculta mientras tanto: ver .con-telon en telon.css) y al llegar se intercambian.
  useLayoutEffect(() => {
    const el = tlalli.current
    const target = document.querySelector('.tlalli-lugar .tlalli-fig')
    if (stage !== 'abriendo' || still || !el || !target) return
    const from = el.getBoundingClientRect()
    const to = target.getBoundingClientRect()
    const move = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})`
    const anim = el.animate([{ transform: 'none' }, { transform: move }], {
      duration: OPEN_MS - 100,
      easing: 'cubic-bezier(0.4, 0, 0.3, 1)',
      fill: 'forwards',
    })
    return () => anim.cancel()
  }, [stage, still])

  if (stage === 'fuera') return null
  const phase = stage ?? (ready ? 'listo' : 'cargando')

  return (
    <div className={`telon is-${phase}`} style={{ '--n': PLIEGUES } as CSSProperties}>
      <div className="telon-cortina">
        <div className="telon-tela" aria-hidden="true">
          {Array.from({ length: PLIEGUES }, (_, i) => (
            <span key={i} className="telon-pliegue" style={{ '--i': i } as CSSProperties} />
          ))}
        </div>

        <div className="telon-contenido">
          <p className="telon-titulo">Socotlalli</p>
          <p className="telon-lema">Escucha a la Tierra en vinilos</p>

          <div className="telon-carga">
            <div
              className="telon-barra"
              role="progressbar"
              aria-label="Cargando la cabaña de Tlalli"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <span className="telon-barra-avance" style={{ width: `${percent}%` }} />
            </div>
            <p className="telon-porcentaje" aria-hidden="true">
              {percent} %
            </p>
          </div>
          {/* Solo para lectores de pantalla: avisa una vez al terminar, no en cada porcentaje */}
          <p className="telon-aviso" role="status">
            {ready ? 'Listo. Se abre el telón.' : ''}
          </p>
        </div>
      </div>

      {/* Tlalli no es parte de la cortina: se queda cuando la cortina se va */}
      <div className="telon-tlalli" ref={tlalli} aria-hidden="true">
        <div className="telon-tlalli-salto">
          <TlalliTelonImg />
        </div>
      </div>
    </div>
  )
}
