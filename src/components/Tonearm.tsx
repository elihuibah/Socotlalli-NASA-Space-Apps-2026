// La aguja / brazo lector. Es decorativo: el estado real lo anuncian los botones.
// ESQUELETO: estructura y props; el diseño (posición, animación) lo agrega Frontend.

interface TonearmProps {
  playing: boolean
}

export default function Tonearm({ playing }: TonearmProps) {
  return <div className="tonearm" data-playing={playing} aria-hidden="true" />
}
