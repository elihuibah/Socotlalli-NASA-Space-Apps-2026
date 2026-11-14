// Piezas de fieltro dibujadas en SVG: portadas, disco, ventana e íconos.
import type { DiscId } from '../data/discs'

const stitch = {
  fill: 'none',
  stroke: '#F1F1EC',
  strokeOpacity: 0.7,
  strokeWidth: 1.2,
  strokeDasharray: '4 4',
  strokeLinecap: 'round',
} as const

/** Portada de cada vinilo. Cuando Datos entregue los fotogramas del EIC, aquí va la imagen. */
export function CoverArt({ id }: { id: DiscId }) {
  return (
    <svg className="funda-arte" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {id === 'sst' && (
        <>
          <rect width="100" height="100" rx="4" fill="#4A6DB5" />
          <circle cx="74" cy="24" r="14" fill="#E3A08A" />
          <circle cx="74" cy="24" r="9.5" {...stitch} />
          <path d="M0 40 q12.5 -9 25 0 t25 0 t25 0 t25 0 V100 H0Z" fill="#A9C6EE" />
          <path d="M0 50 q12.5 -9 25 0 t25 0 t25 0 t25 0 V100 H0Z" fill="#7FA6DE" />
          <path d="M0 61 q12.5 -9 25 0 t25 0 t25 0 t25 0 V100 H0Z" fill="#3E5C9C" />
          <path d="M4 46 q10.5 -8 21 0 t21 0 t21 0 t21 0" {...stitch} />
        </>
      )}
      {id === 'ice' && (
        <>
          <rect width="100" height="100" rx="4" fill="#C9D9EE" />
          <path d="M0 70 H100 V100 H0Z" fill="#7FA6DE" />
          <path d="M14 70 L34 26 L50 52 L60 38 L82 70Z" fill="#F1F1EC" />
          <path d="M34 26 L50 52 L44 70 H30Z" fill="#A9C6EE" />
          <path d="M22 66 L34 38 L47 60" {...stitch} stroke="#4A6DB5" />
          <path d="M6 82 h18 M40 88 h22 M74 80 h16" {...stitch} />
        </>
      )}
      {id === 'veg' && (
        <>
          <rect width="100" height="100" rx="4" fill="#546246" />
          <circle cx="78" cy="22" r="10" fill="#F4E2A4" />
          <circle cx="22" cy="92" r="40" fill="#8DB590" />
          <circle cx="78" cy="98" r="44" fill="#A5C2A7" />
          <path d="M-8 78 a34 34 0 0 1 54 -14" {...stitch} />
          <g fill="#546246">
            <circle cx="62" cy="62" r="7" />
            <circle cx="70" cy="58" r="6" />
            <circle cx="74" cy="66" r="6" />
            <circle cx="86" cy="72" r="5" />
          </g>
        </>
      )}
      {id === 'co2' && (
        <>
          <rect width="100" height="100" rx="4" fill="#C9826B" />
          <g fill="#F1F1EC">
            <ellipse cx="34" cy="40" rx="20" ry="9" />
            <circle cx="26" cy="33" r="9" />
            <circle cx="40" cy="30" r="11" />
            <ellipse cx="70" cy="64" rx="17" ry="8" />
            <circle cx="64" cy="58" r="8" />
            <circle cx="76" cy="56" r="9" />
          </g>
          <path d="M10 62 q8 -6 16 0 t16 0 M52 26 q8 -6 16 0 t16 0 M14 84 q8 -6 16 0 t16 0 t16 0" {...stitch} />
        </>
      )}
      <rect x="4" y="4" width="92" height="92" rx="3" {...stitch} strokeOpacity={0.45} />
    </svg>
  )
}

/** Disco de vinilo con la etiqueta del color del disco. */
export function RecordArt({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="50" fill="#1E1715" />
      {[44, 38, 32, 26].map((r) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#3A2C26" strokeWidth="1" />
      ))}
      <circle cx="50" cy="50" r="17" fill={color} />
      <circle cx="50" cy="50" r="12.5" fill="none" stroke="#2E221C" strokeOpacity=".45" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx="50" cy="50" r="2" fill="#1E1715" />
    </svg>
  )
}

/** Escotilla de madera con la luna desenfocada: el único desenfoque de la escena. */
export function WindowArt() {
  return (
    <svg className="ventana" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
      <defs>
        <filter id="luna-suave" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <clipPath id="ventana-cielo">
          <circle cx="116" cy="114" r="88" />
        </clipPath>
      </defs>
      <circle cx="123" cy="123" r="112" fill="#2E221C" />
      <circle cx="116" cy="114" r="112" fill="#B98F63" />
      <circle cx="116" cy="114" r="102" fill="none" stroke="#F1F1EC" strokeOpacity=".6" strokeWidth="2" strokeDasharray="6 6" strokeLinecap="round" />
      <circle cx="116" cy="114" r="92" fill="#8A6644" />
      <g clipPath="url(#ventana-cielo)">
        <circle cx="116" cy="114" r="88" fill="#16223D" />
        <g fill="#F1F1EC">
          <circle cx="62" cy="78" r="1.6" />
          <circle cx="88" cy="150" r="1.3" />
          <circle cx="128" cy="62" r="1.2" />
          <circle cx="170" cy="150" r="1.6" />
          <circle cx="110" cy="176" r="1.1" />
          <circle cx="54" cy="128" r="1.1" />
        </g>
        <circle cx="146" cy="98" r="46" fill="#F1F1EC" opacity=".16" filter="url(#luna-suave)" />
        <circle cx="146" cy="98" r="30" fill="#F1F1EC" filter="url(#luna-suave)" />
      </g>
      {[45, 135, 225, 315].map((a) => (
        <circle
          key={a}
          cx={116 + 102 * Math.cos((a * Math.PI) / 180)}
          cy={114 + 102 * Math.sin((a * Math.PI) / 180)}
          r="5"
          fill="#8A6644"
        />
      ))}
    </svg>
  )
}

export const IconPlay = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M8 5v14l11-7z" />
  </svg>
)

export const IconPause = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
  </svg>
)
