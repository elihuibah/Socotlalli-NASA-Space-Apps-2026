// El disco giratorio: muestra el fotograma activo como la etiqueta del disco.
// ESQUELETO: estructura y props; el diseño (textura, giro) lo agrega Frontend.

import type { Disc } from '../data/discs'
import { frameImageUrl } from '../data/discs'

interface VinylDiscProps {
  disc: Disc | null
  frameIndex: number
  spinning: boolean
}

export default function VinylDisc({ disc, frameIndex, spinning }: VinylDiscProps) {
  const frame = disc?.frames[frameIndex]
  return (
    <figure className="vinyl-disc" data-spinning={spinning}>
      {frame ? (
        <img src={frameImageUrl(frame)} alt={`${disc.title}: ${frame.text}`} />
      ) : (
        <div className="vinyl-disc__empty">Elige un disco</div>
      )}
    </figure>
  )
}
