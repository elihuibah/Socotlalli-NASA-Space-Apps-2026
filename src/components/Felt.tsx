// Piezas de fieltro ya "horneadas": imágenes con la textura, el borde afelpado y el
// volumen incluidos. Al ser imágenes, moverlas o girarlas no le cuesta nada al navegador.
// La fuente vectorial de cada una está en components/Art.tsx y assets/tlalli.svg.
import type { DiscId } from '../data/discs'
import discoCo2 from '../assets/fieltro/disco-co2.webp'
import discoIce from '../assets/fieltro/disco-ice.webp'
import discoSst from '../assets/fieltro/disco-sst.webp'
import discoVeg from '../assets/fieltro/disco-veg.webp'
import fundaCo2 from '../assets/fieltro/funda-co2.webp'
import fundaIce from '../assets/fieltro/funda-ice.webp'
import fundaSst from '../assets/fieltro/funda-sst.webp'
import fundaVeg from '../assets/fieltro/funda-veg.webp'
import tlalliCuerpo from '../assets/fieltro/tlalli-cuerpo.webp'
import tlalliOjos from '../assets/fieltro/tlalli-ojos.webp'
import ttBrazo from '../assets/fieltro/tt-brazo.webp'
import ttCaja from '../assets/fieltro/tt-caja.webp'
import ventana from '../assets/fieltro/ventana.webp'

// Aerosoles usa por ahora el arte de hielo y bosques el de vegetación (ver `art` en data/discs.ts).
const FUNDAS: Record<DiscId, string> = { sst: fundaSst, aerosols: fundaIce, forest: fundaVeg, co2: fundaCo2 }
const DISCOS: Record<DiscId, string> = { sst: discoSst, aerosols: discoIce, forest: discoVeg, co2: discoCo2 }

// Todas son decorativas: el nombre accesible lo da el botón o la región que las contiene.
const img = { alt: '', draggable: false, decoding: 'async' } as const

export const CoverImg = ({ id }: { id: DiscId }) => <img {...img} className="funda-arte" src={FUNDAS[id]} />
export const RecordImg = ({ id, className }: { id: DiscId; className?: string }) => (
  <img {...img} className={className} src={DISCOS[id]} />
)
export const WindowImg = () => <img {...img} className="ventana" src={ventana} />
export const TurntableBoxImg = () => <img {...img} className="tt-caja" src={ttCaja} />
export const TurntableArmImg = ({ down }: { down: boolean }) => (
  <img {...img} className={`tt-brazo${down ? ' is-down' : ''}`} src={ttBrazo} />
)

/** Tlalli: cuerpo y ojos en capas separadas para que pueda parpadear. Al caminar le salen pies. */
export function TlalliImg({ listening, walking = null }: { listening: boolean; walking?: 'derecha' | 'izquierda' | null }) {
  const cls = ['tlalli-fig', listening && !walking && 'is-listening', walking && `is-walking is-${walking}`].filter(Boolean).join(' ')
  return (
    <div className={cls} role="img" aria-label={walking ? 'Tlalli, la Tierra con ojos grandes, va caminando' : 'Tlalli, la Tierra con ojos grandes'}>
      <span className="tlalli-pie is-izq" aria-hidden="true" />
      <span className="tlalli-pie is-der" aria-hidden="true" />
      <img {...img} className="tlalli-cuerpo" src={tlalliCuerpo} />
      <img {...img} className="tlalli-ojos" src={tlalliOjos} />
    </div>
  )
}
