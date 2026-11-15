// El pizarrón: segunda parte de la cabaña, a la derecha del buró. Muestra el mapa de cada
// disco con sus datos reales (disc.json) y las estadísticas del lugar que se toque.
import { useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import type { Disc } from '../data/discs'
import {
  COLS,
  ROWS,
  colRow,
  compareWords,
  formatValue,
  frameLabel,
  hasData,
  idx,
  imageUrl,
  isGlobe,
  normalMeaning,
  placeOf,
  shortMeasure,
  summarize,
} from '../data/realData'
import type { DataMap, DiscData } from '../data/realData'

type Mode = 'imagen' | 'valor' | 'anomalia'

const MODES: { id: Mode; label: string }[] = [
  { id: 'imagen', label: 'Imagen NASA' },
  { id: 'valor', label: 'Valor' },
  { id: 'anomalia', label: 'Comparado con lo normal' },
]

// Dónde empieza el pizarrón si aún no se ha tocado nada: el centro del mapa.
const START_CELL = idx(COLS / 2, ROWS / 2 - 3)

/** Por qué una celda no tiene dato, según el disco. */
function noDataReason(d: DiscData) {
  if (d.id === 'sst') return 'Es tierra: este disco solo mide la temperatura del mar.'
  if (isGlobe(d)) return 'Aquí se ve océano, hielo o el borde del globo: no hay bosque que medir.'
  return 'En esta celda la imagen no trae dato.'
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Muestra solo el disco que está en el tocadiscos: para ver otro hay que volver al buró
 * y cambiar el vinilo, como en un tocadiscos de verdad. App le pone key={disc.id}, así
 * que al cambiar de disco el pizarrón empieza de cero.
 */
export function Pizarron(props: {
  disc: Disc
  data: DataMap
  error?: string
  playing: boolean
  playingFrame: number
  active: boolean
  onBack: () => void
  onSay: (text: string) => void
}) {
  const { disc, data, error, playing, playingFrame, active, onBack, onSay } = props
  const d = data[disc.id]

  const [chosenFrame, setChosenFrame] = useState(0)
  // Si este disco está sonando, el pizarrón sigue a la música hasta que se mueva la línea de tiempo.
  const [follow, setFollow] = useState(true)
  const [cell, setCell] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [mode, setMode] = useState<Mode>('imagen')

  const isPlayingHere = playing
  const nFrames = d?.frames.length ?? 1
  const frame = Math.min(nFrames - 1, isPlayingHere && follow ? playingFrame : chosenFrame)

  const goFrame = (i: number) => {
    setFollow(false)
    setChosenFrame(Math.max(0, Math.min(nFrames - 1, i)))
  }

  /** Frase corta de Tlalli sobre la celda. */
  const describe = (data: DiscData, f: number, i: number) => {
    const place = placeOf(data, f, i, props.data.sst?.mask)
    const where = place.detail ? `${place.name} (${place.detail})` : place.name
    if (!hasData(data, f, i)) return `${where}: ${noDataReason(data)}`
    const v = formatValue(data, data.frames[f].values[i])
    return `${where}: ${v}, ${compareWords(data, data.frames[f].anomaly[i])}.`
  }

  const pick = (i: number) => {
    setCell(i)
    if (d) onSay(describe(d, frame, i))
  }

  const cellAt = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const col = Math.min(COLS - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * COLS)))
    const row = Math.min(ROWS - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * ROWS)))
    return idx(col, row)
  }

  const onMapKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const m = moves[e.key]
    if (!m) return
    e.preventDefault()
    const { col, row } = colRow(cell ?? START_CELL)
    // El mapa da la vuelta de este a oeste; arriba y abajo se detienen en los polos.
    const c = (col + m[0] + COLS) % COLS
    const r = Math.max(0, Math.min(ROWS - 1, row + m[1]))
    pick(idx(c, r))
  }

  return (
    <section className="lado-pizarron" aria-label="Pizarrón: datos y mapa" inert={!active}>
      <div className="piz-marco fieltro">
        <div className="pizarron fieltro">
          <header className="piz-titulo">
            <p className="eyebrow">
              Op. {disc.opus} · {disc.variable}
            </p>
            <button type="button" className="btn-texto piz-volver" onClick={onBack}>
              <span aria-hidden="true">←</span> Volver al tocadiscos
            </button>
            <div className="piz-titulo-linea">
              <h2>{d?.title ?? disc.title}</h2>
              {d && <p className="piz-mide">{shortMeasure(d)}</p>}
            </div>
          </header>

          {!d ? (
            <p className="piz-cargando">{error ? `No pude leer los datos: ${error}` : 'Cargando los datos del satélite…'}</p>
          ) : (
            <div className="piz-cuerpo">
              <div className="piz-izq">
                <div className="piz-fila-modos">
                  <div className="piz-modos" role="radiogroup" aria-label="Qué se ve en el mapa">
                    {MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        role="radio"
                        aria-checked={mode === m.id}
                        className={`piz-modo${mode === m.id ? ' is-on' : ''}`}
                        onClick={() => setMode(m.id)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {mode === 'imagen' ? <p className="piz-leyenda">Toca un lugar del mapa.</p> : <Legend d={d} mode={mode} />}
                </div>

                <MapView
                  d={d}
                  frame={frame}
                  mode={mode}
                  cell={cell}
                  hover={hover}
                  onPick={(e) => pick(cellAt(e))}
                  onHover={(e) => setHover(e ? cellAt(e) : null)}
                  onKeyDown={onMapKey}
                />

                <Timeline
                  d={d}
                  frame={frame}
                  following={isPlayingHere && follow}
                  canFollow={isPlayingHere && !follow}
                  onFrame={goFrame}
                  onFollow={() => setFollow(true)}
                />
              </div>

              <aside className="piz-datos" aria-label="Estadísticas">
                {cell === null ? (
                  <div className="piz-lugar is-vacio">
                    <p className="eyebrow">Un lugar</p>
                    <p>Toca el mapa para ver los datos de ese lugar.</p>
                  </div>
                ) : (
                  <CellStats d={d} frame={frame} cell={cell} place={placeOf(d, frame, cell, data.sst?.mask)} />
                )}
              </aside>

              <MapSummaryView d={d} frame={frame} seaMask={data.sst?.mask} onPick={pick} />
            </div>
          )}

          {d && <p className="piz-credito">{d.credit}</p>}
        </div>
        <div className="piz-repisa" aria-hidden="true">
          <span className="gis" />
          <span className="gis is-amarillo" />
          <span className="borrador" />
        </div>
      </div>
    </section>
  )
}

// ---- El mapa con su rejilla de 32 x 16 --------------------------------------
function MapView(props: {
  d: DiscData
  frame: number
  mode: Mode
  cell: number | null
  hover: number | null
  onPick: (e: MouseEvent<HTMLDivElement>) => void
  onHover: (e: MouseEvent<HTMLDivElement> | null) => void
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void
}) {
  const { d, frame, mode, cell, hover } = props
  const f = d.frames[frame]
  const globe = isGlobe(d)

  const rect = (i: number, className: string) => {
    const { col, row } = colRow(i)
    return <rect className={className} x={col} y={row} width={1} height={1} />
  }

  return (
    <div className={`piz-mapa${globe ? ' is-globo' : ''}`}>
      {/* La caja mide el espacio libre del pizarrón y el mapa crece hasta llenarlo (pizarron.css) */}
      <div className="piz-mapa-caja">
      <div
        className="piz-mapa-area"
        role="application"
        tabIndex={0}
        aria-roledescription="mapa"
        aria-label={`Mapa de ${d.title}, ${frameLabel(d, frame)}. Toca un lugar o usa las flechas para moverte.`}
        onClick={props.onPick}
        onMouseMove={props.onHover}
        onMouseLeave={() => props.onHover(null)}
        onKeyDown={props.onKeyDown}
      >
        <img src={imageUrl(f.image)} alt="" draggable={false} className={mode === 'imagen' ? '' : 'is-tenue'} />
        <svg viewBox={`0 0 ${COLS} ${ROWS}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          {mode !== 'imagen' &&
            f.values.map((v, i) => {
              if (!hasData(d, frame, i)) return null
              const { col, row } = colRow(i)
              if (mode === 'valor') {
                return <rect key={i} x={col} y={row} width={1} height={1} fill={d.accent} fillOpacity={0.12 + 0.85 * v} />
              }
              const a = f.anomaly[i]
              return (
                <rect key={i} x={col} y={row} width={1} height={1} fill={a > 0 ? '#E3A08A' : '#7FA6DE'} fillOpacity={Math.min(0.95, Math.abs(a) * 1.1)} />
              )
            })}
          {hover !== null && hover !== cell && rect(hover, 'celda-hover')}
          {cell !== null && rect(cell, 'celda-elegida')}
        </svg>
        {cell !== null && (
          <span
            className="piz-alfiler"
            aria-hidden="true"
            style={{ left: `${((colRow(cell).col + 0.5) / COLS) * 100}%`, top: `${((colRow(cell).row + 0.5) / ROWS) * 100}%` }}
          />
        )}
      </div>
      </div>
    </div>
  )
}

function Legend({ d, mode }: { d: DiscData; mode: Mode }) {
  if (mode === 'valor') {
    return (
      <p className="piz-leyenda">
        <span className="piz-escala" style={{ background: `linear-gradient(90deg, transparent, ${d.accent})` }} />
        <span>
          {formatValue(d, 0)} a {formatValue(d, 1)}
        </span>
      </p>
    )
  }
  return (
    <p className="piz-leyenda">
      <span className="piz-escala" style={{ background: 'linear-gradient(90deg, #7FA6DE, transparent, #E3A08A)' }} />
      <span>Por debajo · por encima {normalMeaning(d)}</span>
    </p>
  )
}

// ---- Línea de tiempo (o de vistas, en el globo) -----------------------------
function Timeline(props: {
  d: DiscData
  frame: number
  following: boolean
  canFollow: boolean
  onFrame: (i: number) => void
  onFollow: () => void
}) {
  const { d, frame, following, canFollow } = props
  const n = d.frames.length
  const what = isGlobe(d) ? 'Vista' : 'Fecha'
  if (n === 1) {
    return (
      <p className="piz-tiempo is-unico">
        {what}: <strong>{frameLabel(d, 0)}</strong> · una sola imagen
      </p>
    )
  }
  return (
    <div className="piz-tiempo">
      <button type="button" className="piz-paso" onClick={() => props.onFrame(frame - 1)} disabled={frame === 0} aria-label={`${what} anterior`}>
        ‹
      </button>
      <label className="piz-deslizador">
        <span className="piz-tiempo-texto">
          {what} {frame + 1} de {n}: <strong>{frameLabel(d, frame)}</strong>
          {following && <span className="piz-siguiendo"> · sigue a la música</span>}
        </span>
        <input type="range" min={0} max={n - 1} step={1} value={frame} onChange={(e) => props.onFrame(Number(e.target.value))} aria-valuetext={frameLabel(d, frame)} />
      </label>
      <button type="button" className="piz-paso" onClick={() => props.onFrame(frame + 1)} disabled={frame === n - 1} aria-label={`${what} siguiente`}>
        ›
      </button>
      {canFollow && (
        <button type="button" className="btn-texto piz-seguir" onClick={props.onFollow}>
          Seguir la música
        </button>
      )}
    </div>
  )
}

// ---- Estadísticas -----------------------------------------------------------
/** Todo el mapa en esta fecha: promedio, lo más alto y lo más bajo (con botón para ir ahí). */
function MapSummaryView(props: { d: DiscData; frame: number; seaMask?: number[]; onPick: (i: number) => void }) {
  const { d, frame, seaMask, onPick } = props
  const summary = summarize(d, frame)
  // En el globo el nombre es el de la vista (el mismo para todo); se dice la posición.
  const where = (i: number) => {
    const p = placeOf(d, frame, i, seaMask)
    return isGlobe(d) ? capitalize(p.detail) : p.name
  }
  return (
    <div className="piz-resumen">
      <p className="eyebrow">Todo el mapa · {frameLabel(d, frame)}</p>
      {summary ? (
        <dl className="piz-cifras">
          <div>
            <dt>Promedio</dt>
            <dd>{formatValue(d, summary.mean)}</dd>
          </div>
          <div>
            <dt>Lo más alto</dt>
            <dd>
              <button type="button" className="piz-ir" onClick={() => onPick(summary.maxIndex)} title="Ir ahí en el mapa">
                {formatValue(d, summary.max)} <span>{where(summary.maxIndex)}</span>
              </button>
            </dd>
          </div>
          <div>
            <dt>Lo más bajo</dt>
            <dd>
              <button type="button" className="piz-ir" onClick={() => onPick(summary.minIndex)} title="Ir ahí en el mapa">
                {formatValue(d, summary.min)} <span>{where(summary.minIndex)}</span>
              </button>
            </dd>
          </div>
        </dl>
      ) : (
        <p>En esta vista no hay celdas con dato.</p>
      )}
      <p className="piz-frase">{d.frames[frame].text}</p>
    </div>
  )
}

function CellStats({ d, frame, cell, place }: { d: DiscData; frame: number; cell: number; place: { name: string; detail: string } }) {
  const f = d.frames[frame]
  const ok = hasData(d, frame, cell)
  const a = f.anomaly[cell]
  return (
    <div className="piz-lugar">
      <p className="eyebrow">Este lugar</p>
      <p className="piz-lugar-nombre">
        {place.name}
        {place.detail && <span className="piz-lugar-detalle"> · {place.detail}</span>}
      </p>
      {!ok ? (
        <p className="piz-sin-dato">{noDataReason(d)}</p>
      ) : (
        <>
          <p className="piz-valor">
            {formatValue(d, f.values[cell])}
            <span className="piz-valor-que">{d.units ? 'en esta celda' : 'de intensidad'}</span>
          </p>
          <div className="piz-anomalia">
            <p>
              <strong>{capitalize(compareWords(d, a))}</strong>
            </p>
            <span className="piz-barra" aria-hidden="true">
              <span className="piz-barra-cero" />
              <span
                className={`piz-barra-valor ${a >= 0 ? 'is-arriba' : 'is-abajo'}`}
                style={{ width: `${Math.abs(a) * 50}%`, [a >= 0 ? 'left' : 'right']: '50%' }}
              />
            </span>
          </div>
          {f.layers && d.layer_names && <Layers d={d} frame={frame} cell={cell} />}
          {!isGlobe(d) && d.frames.length > 1 && <Sparkline d={d} frame={frame} cell={cell} />}
        </>
      )}
    </div>
  )
}

/** "el carbono negro (humo de incendios)" -> "Humo de incendios"; "la sal marina" -> "Sal marina". */
function shortLayerName(name: string) {
  const inParens = name.match(/\(([^)]+)\)/)
  return capitalize(inParens ? inParens[1] : name.replace(/^(el|la|los|las) /, ''))
}

/** Aerosoles: cuánto aporta cada tipo de partícula en la celda. */
function Layers({ d, frame, cell }: { d: DiscData; frame: number; cell: number }) {
  const layers = d.frames[frame].layers!
  const names = d.layer_names!
  const keys = Object.keys(layers).sort((x, y) => layers[y][cell] - layers[x][cell])
  return (
    <div className="piz-capas">
      <p className="piz-mini">Qué flota aquí</p>
      <ul>
        {keys.map((k) => (
          <li key={k}>
            <span className="piz-capa-nombre" title={capitalize(names[k] ?? k)}>
              {shortLayerName(names[k] ?? k)}
            </span>
            <span className="piz-capa-barra" aria-hidden="true">
              <span style={{ width: `${Math.round(layers[k][cell] * 100)}%` }} />
            </span>
            <span className="piz-capa-num">{Math.round(layers[k][cell] * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Cómo cambió este lugar en todas las fechas del disco. */
function Sparkline({ d, frame, cell }: { d: DiscData; frame: number; cell: number }) {
  const W = 100
  const H = 34
  const n = d.frames.length
  const pts = d.frames.map((f, k) => ({ k, v: hasData(d, k, cell) ? f.values[cell] : null }))
  const vals = pts.filter((p) => p.v !== null).map((p) => p.v as number)
  if (vals.length < 2) return null
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const span = hi - lo || 1
  const x = (k: number) => (k / (n - 1)) * W
  const y = (v: number) => H - 3 - ((v - lo) / span) * (H - 6)
  const line = pts.filter((p) => p.v !== null).map((p) => `${x(p.k).toFixed(1)},${y(p.v as number).toFixed(1)}`).join(' ')
  const cur = pts[frame].v
  return (
    <div className="piz-historia">
      <p className="piz-mini">
        En todas las fechas: de {formatValue(d, lo)} a {formatValue(d, hi)}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {cur !== null && <circle cx={x(frame)} cy={y(cur)} r="2.6" fill="#F4E2A4" />}
      </svg>
      <p className="piz-mini piz-historia-fechas">
        <span>{frameLabel(d, 0)}</span>
        <span>{frameLabel(d, n - 1)}</span>
      </p>
    </div>
  )
}
