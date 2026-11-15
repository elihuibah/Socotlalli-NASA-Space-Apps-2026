// FUENTE VECTORIAL de las piezas de fieltro: portadas, disco, ventana y tocadiscos.
// La página no dibuja estos SVG en vivo: se "hornean" una vez con el filtro #fieltro
// y se guardan como imágenes en src/assets/fieltro (ver components/Felt.tsx).
// Si cambian un dibujo aquí, hay que volver a hornear su imagen.
import type { FeltArt } from '../data/discs'

const stitch = {
  fill: 'none',
  stroke: '#F1F1EC',
  strokeOpacity: 0.7,
  strokeWidth: 1.2,
  strokeDasharray: '4 4',
  strokeLinecap: 'round',
} as const

/** Portada de cada vinilo. Cuando Datos entregue los fotogramas del EIC, aquí va la imagen. */
export function CoverArt({ id }: { id: FeltArt }) {
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
      {/* Cristal (hielo marino): un cristal de hielo tallado sobre la noche polar */}
      {id === 'cristal' && (
        <>
          <rect width="100" height="100" rx="4" fill="#16223D" />
          <path d="M0 70 H100 V100 H0Z" fill="#24365F" />
          {/* cristal grande, con sus facetas */}
          <path d="M57 7 L78 24 L72 52 L57 62 L42 52 L36 24Z" fill="#A9D6F0" />
          <path d="M57 7 L78 24 L57 32Z" fill="#F1F1EC" />
          <path d="M57 7 L36 24 L57 32Z" fill="#D3E9F7" />
          <path d="M57 32 L78 24 L72 52 L57 62Z" fill="#7FA6DE" />
          <path d="M57 32 L36 24 L42 52 L57 62Z" fill="#A9C6EE" />
          <path d="M57 9 V60 M38 25 L57 32 L76 25" {...stitch} stroke="#3E5C9C" strokeOpacity={0.9} />
          {/* cristales chicos */}
          <path d="M21 34 L30 43 L27 58 L21 62 L15 58 L13 43Z" fill="#A9C6EE" />
          <path d="M21 34 L30 43 L21 47Z" fill="#F1F1EC" />
          <path d="M21 47 L30 43 L27 58 L21 62Z" fill="#7FA6DE" />
          <path d="M88 40 L94 47 L92 58 L88 61 L83 58 L82 47Z" fill="#7FA6DE" />
          <path d="M88 40 L94 47 L88 50Z" fill="#D3E9F7" />
          {/* destellos */}
          <path d="M20 14 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2Z" fill="#F4E2A4" />
          <path d="M90 18 l1.3 3.2 3.2 1.3 -3.2 1.3 -1.3 3.2 -1.3 -3.2 -3.2 -1.3 3.2 -1.3Z" fill="#F1F1EC" />
          <path d="M6 80 h20 M44 88 h24 M78 80 h14" {...stitch} strokeOpacity={0.5} />
        </>
      )}
      {/* Brasas (incendios): llamas y chispas sobre carbón */}
      {id === 'brasas' && (
        <>
          <rect width="100" height="100" rx="4" fill="#2E221C" />
          <circle cx="58" cy="46" r="34" fill="#4A2A20" />
          {/* llamas */}
          <path d="M27 30 C36 41 39 50 34 57 C30 62 22 60 21 53 C20 46 24 40 27 30Z" fill="#C9826B" />
          <path d="M86 34 C92 43 94 50 90 55 C86 59 80 57 79 52 C78 46 83 42 86 34Z" fill="#D9421C" />
          <path d="M58 8 C76 28 82 44 73 57 C67 65 49 66 43 57 C34 43 51 32 58 8Z" fill="#F0642A" />
          <path d="M58 28 C67 41 70 50 65 57 C61 62 53 61 51 55 C48 47 55 41 58 28Z" fill="#F4E2A4" />
          <path d="M58 40 V56" {...stitch} stroke="#F0642A" strokeOpacity={0.9} />
          {/* brasas encendidas */}
          <g fill="#8E2413">
            <ellipse cx="30" cy="66" rx="13" ry="6" />
            <ellipse cx="58" cy="67" rx="15" ry="6.5" />
            <ellipse cx="84" cy="66" rx="12" ry="6" />
          </g>
          <g fill="#F0642A">
            <ellipse cx="27" cy="65" rx="5" ry="2" />
            <ellipse cx="60" cy="66" rx="6" ry="2.2" />
            <ellipse cx="86" cy="65" rx="4" ry="1.8" />
          </g>
          {/* ceniza y chispas */}
          <path d="M0 70 H100 V100 H0Z" fill="#3A2C26" />
          <g fill="#F4E2A4">
            <circle cx="16" cy="16" r="2.2" />
            <circle cx="34" cy="10" r="1.6" />
            <circle cx="84" cy="14" r="2" />
            <circle cx="10" cy="40" r="1.5" />
          </g>
          <path d="M16 22 q4 6 0 12 M84 19 q-4 5 0 10" {...stitch} stroke="#F4E2A4" strokeOpacity={0.6} />
        </>
      )}
      {/* Siglo de calor (temperatura global): franjas de azul a rojo, de 1885 a 2021 */}
      {id === 'siglo' && (
        <>
          <rect width="100" height="100" rx="4" fill="#4A2018" />
          {['#2F4A82', '#3E5C9C', '#4A6DB5', '#7FA6DE', '#A9C6EE', '#D9CDBD', '#E3A08A', '#C9826B', '#D9421C', '#A52C16'].map((c, i) => (
            <rect key={c} x={i * 10} y="0" width={i === 9 ? 10 : 10.6} height="64" rx={i === 0 || i === 9 ? 4 : 0} fill={c} />
          ))}
          <rect x="0" y="58" width="100" height="42" rx="4" fill="#4A2018" />
          {/* la temperatura sube con los años */}
          <path d="M6 46 C22 44 30 47 42 40 S62 34 72 24 S86 14 90 10" {...stitch} strokeWidth={1.8} strokeOpacity={0.95} />
          <circle cx="90" cy="10" r="5" fill="#F4E2A4" />
          <path d="M5 64 H95" {...stitch} strokeOpacity={0.5} />
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

/** Filtro de fieltro: fibras, borde afelpado y volumen. Se usa en CSS con filter: url(#fieltro). */
export function FeltDefs() {
  const gris = '.33 .33 .33 0 0  .33 .33 .33 0 0  .33 .33 .33 0 0  0 0 0 0 1'
  return (
    <svg className="defs-fieltro" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter id="fieltro" x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" result="ruido" />
          {/* borde afelpado: el contorno se deshilacha un poco */}
          <feDisplacementMap in="SourceGraphic" in2="ruido" scale="4" xChannelSelector="R" yChannelSelector="G" result="pieza" />
          {/* fibras: ruido gris que aclara y oscurece la tela */}
          <feColorMatrix in="ruido" type="matrix" values={gris} result="gris" />
          <feComponentTransfer in="gris" result="fibras">
            <feFuncR type="linear" slope="2.4" intercept="-0.7" />
            <feFuncG type="linear" slope="2.4" intercept="-0.7" />
            <feFuncB type="linear" slope="2.4" intercept="-0.7" />
          </feComponentTransfer>
          <feBlend in="fibras" in2="pieza" mode="soft-light" result="tela" />
          {/* volumen: la pieza se ilumina como un recorte grueso y mullido */}
          <feGaussianBlur in="pieza" stdDeviation="2.4" result="suave" />
          <feDiffuseLighting in="suave" surfaceScale="5" diffuseConstant="1.27" lightingColor="#ffffff" result="luz">
            <feDistantLight azimuth="225" elevation="52" />
          </feDiffuseLighting>
          <feBlend in="luz" in2="tela" mode="multiply" result="iluminada" />
          <feComposite in="iluminada" in2="pieza" operator="in" />
        </filter>
      </defs>
    </svg>
  )
}

/** Caja del tocadiscos vista de frente (fuente para hornear). */
export function TurntableBoxArt() {
  return (
    <svg className="tt-caja" viewBox="0 0 320 250" aria-hidden="true" focusable="false">
        {/* patas */}
        <rect x="30" y="232" width="26" height="12" rx="4" fill="#2E221C" />
        <rect x="264" y="232" width="26" height="12" rx="4" fill="#2E221C" />
        {/* tapa superior, en perspectiva */}
        <path d="M36 92 H284 L312 142 H8Z" fill="#3A2C26" />
        <ellipse cx="140" cy="113" rx="112" ry="26" fill="#241A16" />
        {/* frente de la caja */}
        <rect x="8" y="138" width="304" height="98" rx="12" fill="#A0603F" />
        <rect x="15" y="145" width="290" height="84" rx="8" fill="none" stroke="#F1F1EC" strokeOpacity=".55" strokeWidth="2" strokeDasharray="7 6" strokeLinecap="round" />
        {/* bocina tejida */}
        <rect x="28" y="156" width="164" height="62" rx="9" fill="#C99B6B" />
        <g fill="#7A4B32">
          {Array.from({ length: 4 }, (_, r) =>
            Array.from({ length: 11 }, (_, c) => <circle key={`${r}-${c}`} cx={40 + c * 14 + (r % 2) * 7} cy={166 + r * 14} r="3.2" />),
          )}
        </g>
        {/* perilla y foco */}
        <circle cx="212" cy="170" r="4.5" fill="#F4E2A4" />
        <circle cx="252" cy="188" r="21" fill="#2E221C" />
        <circle cx="252" cy="188" r="13" fill="none" stroke="#F1F1EC" strokeOpacity=".5" strokeWidth="1.8" strokeDasharray="4 4" strokeLinecap="round" />
        <path d="M252 172 v9" stroke="#F4E2A4" strokeWidth="4" strokeLinecap="round" />
      </svg>
  )
}

/** Brazo del tocadiscos en posición de tocar (fuente para hornear). */
export function TurntableArmArt() {
  return (
    <svg className="tt-brazo-capa" viewBox="0 0 320 250" aria-hidden="true" focusable="false">
        <g>
          <path d="M276 102 L204 116" stroke="#D9CDBD" strokeWidth="7" strokeLinecap="round" />
          <rect x="190" y="108" width="24" height="15" rx="4" fill="#C9826B" transform="rotate(-11 202 115)" />
        </g>
        <circle cx="276" cy="102" r="13" fill="#8A6644" />
        <circle cx="276" cy="102" r="5" fill="#2E221C" />
      </svg>
  )
}

export const IconEject = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M12 5l7.5 9h-15zM5 16.5h14V19H5z" />
  </svg>
)

export const IconArrow = ({ back = false }: { back?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={back ? 'M20 12H5M11 5.5L4.5 12l6.5 6.5' : 'M4 12h15M13 5.5l6.5 6.5-6.5 6.5'} />
  </svg>
)
