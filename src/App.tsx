import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { engine } from './audio/engine'
import { DISCS, FRAME_MS } from './data/discs'
import type { Disc, DiscId } from './data/discs'
import { useSettings } from './hooks/useSettings'
import { RecordArt, WindowArt } from './components/Art'
import { NowPlaying, Turntable } from './components/Console'
import { DiscInfo, Shelf } from './components/Shelf'
import { Bubbles, TlalliArt } from './components/Tlalli'
import type { Message } from './components/Tlalli'

// ---- Lo que dice Tlalli ----------------------------------------------------
const INTRO = [
  'Hola, soy Tlalli. Así me llaman en náhuatl: tierra. Bienvenido a mi cabaña en órbita.',
  'Los satélites de la NASA me observan todo el tiempo. Con lo que ven, hice música.',
  'Cada vinilo de la repisa guarda una parte de mí: el mar, el hielo, los bosques y el aire. Haz clic en uno para conocerlo.',
  'Cuando elijas, arrástralo al tocadiscos o pulsa «Poner este disco». Yo me encargo del resto.',
]
const HOW_TO = [
  'Primero, la altura: las notas agudas son valores altos y las graves, valores bajos. Escucha.',
  'Segundo, la tensión: si la música suena incómoda, es que me alejé de lo normal.',
  'Tercero, el lugar: con audífonos, el sonido viaja de oeste a este, de un oído al otro.',
]

type Guide = { kind: 'intro' | 'howto'; index: number } | null
type Drag = { id: DiscId; x: number; y: number; over: boolean }
type Flight = { disc: Disc; from: DOMRect; to: DOMRect }

const discById = (id: DiscId | null) => DISCS.find((d) => d.id === id) ?? null

export default function App() {
  const [settings, setSetting] = useSettings()
  const [messages, setMessages] = useState<Message[]>([{ id: 0, text: INTRO[0] }])
  const [guide, setGuide] = useState<Guide>({ kind: 'intro', index: 0 })
  const [selectedId, setSelectedId] = useState<DiscId | null>(null)
  const [currentId, setCurrentId] = useState<DiscId | null>(null)
  const [playing, setPlaying] = useState(false)
  const [frame, setFrame] = useState(0)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [flight, setFlight] = useState<Flight | null>(null)
  const [a11yOpen, setA11yOpen] = useState(false)

  const nextId = useRef(1)
  const covers = useRef(new Map<DiscId, HTMLButtonElement>())
  const turntable = useRef<HTMLButtonElement | null>(null)
  const pointer = useRef<{ id: DiscId; x: number; y: number; active: boolean } | null>(null)
  const suppressClick = useRef(false)
  const tenseSaid = useRef(new Set<DiscId>())
  const flyEl = useRef<HTMLDivElement | null>(null)

  const selected = discById(selectedId)
  const current = discById(currentId)

  const say = useCallback((text: string) => {
    const id = nextId.current++
    setMessages((prev) => [...prev.slice(-1), { id, text }])
  }, [])

  // ---- Guía de Tlalli (introducción y "Cómo se escucha") --------------------
  const lines = guide?.kind === 'howto' ? HOW_TO : INTRO
  const nextLine = () => {
    if (!guide) return
    const i = guide.index + 1
    if (i >= lines.length) {
      setGuide(null)
      say(guide.kind === 'intro' ? 'Elige un vinilo de la repisa cuando quieras.' : 'Eso es todo. Ahora pon un disco y compruébalo.')
      return
    }
    setGuide({ ...guide, index: i })
    say(lines[i])
    if (guide.kind === 'howto') engine.preview(i)
  }
  const skipGuide = () => {
    setGuide(null)
    say('Está bien. Elige un vinilo de la repisa cuando quieras.')
  }
  const startHowTo = () => {
    setGuide({ kind: 'howto', index: 0 })
    say(HOW_TO[0])
    engine.preview(0)
  }

  // ---- Elegir, colocar y reproducir ----------------------------------------
  const select = (id: DiscId) => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    const d = discById(id)
    if (!d) return
    setSelectedId(id)
    setGuide(null)
    say(`«${d.title}» guarda ${d.about}. ¿Lo ponemos?`)
  }

  const finishPlace = useCallback(
    (d: Disc) => {
      setFlight(null)
      setCurrentId(d.id)
      setSelectedId(d.id)
      setFrame(0)
      setPlaying(true)
      engine.loadDisc(d)
      engine.play()
      say(d.listen)
    },
    [say],
  )

  const place = (d: Disc, animate: boolean) => {
    void engine.start() // este clic es el que le permite al navegador sonar
    setGuide(null)
    const from = covers.current.get(d.id)
    const to = turntable.current
    if (animate && !settings.reduceMotion && from && to) {
      setFlight({ disc: d, from: from.getBoundingClientRect(), to: to.getBoundingClientRect() })
    } else {
      finishPlace(d)
    }
  }

  // El vinilo vuela de la repisa al plato (800 ms) cuando se coloca con el botón.
  useLayoutEffect(() => {
    const el = flyEl.current
    if (!flight || !el) return
    const { from, to, disc } = flight
    const size = from.width
    const targetX = to.left + to.width * (124 / 320) - (from.left + size / 2)
    const targetY = to.top + to.height * (103 / 206) - (from.top + size / 2)
    const scale = (to.width * (146 / 320)) / size
    const anim = el.animate(
      [
        { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
        { transform: `translate(${targetX * 0.5}px, ${Math.min(targetY, 0) * 0.5 - 70}px) scale(${(1 + scale) / 2}) rotate(160deg)`, offset: 0.55 },
        { transform: `translate(${targetX}px, ${targetY}px) scale(${scale}) rotate(320deg)` },
      ],
      { duration: 800, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' },
    )
    anim.onfinish = () => finishPlace(disc)
    return () => anim.cancel()
  }, [flight, finishPlace])

  const toggle = () => {
    if (!current) {
      say('El tocadiscos está vacío. Elige un vinilo de la repisa.')
      return
    }
    if (playing) {
      engine.pause()
      setPlaying(false)
      say('Pausa. Aquí te espero.')
    } else {
      void engine.start()
      engine.play()
      setPlaying(true)
    }
  }

  const eject = () => {
    engine.pause()
    setPlaying(false)
    setCurrentId(null)
    say('Listo, lo guardé en la repisa. ¿Cuál sigue?')
  }

  // Avance de fotogramas mientras suena.
  useEffect(() => {
    if (!playing || !current) return
    const t = window.setTimeout(() => {
      const next = (frame + 1) % current.frames.length
      setFrame(next)
      engine.setFrame(next)
      if (Math.abs(current.frames[next].anomaly) > 0.7 && !tenseSaid.current.has(current.id)) {
        tenseSaid.current.add(current.id)
        say('¿Oyes cómo se tensa la armonía? Ahí me alejé de lo normal.')
      }
    }, FRAME_MS)
    return () => window.clearTimeout(t)
  }, [playing, current, frame, say])

  // ---- Arrastrar un vinilo al tocadiscos ------------------------------------
  const isOverTurntable = (x: number, y: number) => {
    const el = turntable.current
    if (!el) return false
    const r = el.getBoundingClientRect()
    return x > r.left - 24 && x < r.right + 24 && y > r.top - 24 && y < r.bottom + 24
  }

  const onDragStart = (e: PointerEvent<HTMLButtonElement>, id: DiscId) => {
    if (e.button !== 0) return
    pointer.current = { id, x: e.clientX, y: e.clientY, active: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onDragMove = (e: PointerEvent<HTMLButtonElement>) => {
    const p = pointer.current
    if (!p) return
    if (!p.active) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8) return
      p.active = true
      setGuide(null)
      say('Eso, llévalo al tocadiscos y suéltalo sobre el plato.')
    }
    setDrag({ id: p.id, x: e.clientX, y: e.clientY, over: isOverTurntable(e.clientX, e.clientY) })
  }
  const onDragEnd = (e: PointerEvent<HTMLButtonElement>) => {
    const p = pointer.current
    pointer.current = null
    if (!p?.active) return
    suppressClick.current = true
    window.setTimeout(() => (suppressClick.current = false), 0)
    setDrag(null)
    const d = discById(p.id)
    if (d && isOverTurntable(e.clientX, e.clientY)) place(d, false)
    else say('Casi. Suéltalo encima del tocadiscos.')
  }
  const onDragCancel = () => {
    pointer.current = null
    setDrag(null)
  }

  const registerCover = useCallback((id: DiscId, el: HTMLButtonElement | null) => {
    if (el) covers.current.set(id, el)
    else covers.current.delete(id)
  }, [])
  const registerTurntable = useCallback((el: HTMLButtonElement | null) => {
    turntable.current = el
  }, [])

  const dragged = discById(drag?.id ?? null)

  return (
    <div className={`cabana${drag ? ' is-dragging' : ''}`}>
      <div className="cabin" aria-hidden="true">
        <svg className="cabin-arco" viewBox="0 0 1440 900" preserveAspectRatio="none">
          <path d="M34 900 V210 Q34 52 220 34 H1220 Q1406 52 1406 210 V900" fill="none" stroke="#2E221C" strokeWidth="26" vectorEffect="non-scaling-stroke" />
          <path d="M34 900 V210 Q34 52 220 34 H1220 Q1406 52 1406 210 V900" fill="none" stroke="#F1F1EC" strokeOpacity=".28" strokeWidth="2" strokeDasharray="7 7" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="cabin-luces" />
        <div className="cabin-piso" />
        <div className="tapete" />
      </div>

      <header className="cab-header">
        <p className="logo">Socotlalli</p>
        <nav aria-label="Opciones" className="cab-nav">
          <button type="button" className="btn-texto" onClick={startHowTo}>
            Cómo se escucha
          </button>
          <button type="button" className="btn-texto" aria-expanded={a11yOpen} aria-controls="panel-a11y" onClick={() => setA11yOpen((o) => !o)}>
            Accesibilidad
          </button>
        </nav>
        {a11yOpen && (
          <div id="panel-a11y" className="a11y-panel cosido">
            <label>
              <input type="checkbox" checked={settings.reduceMotion} onChange={(e) => setSetting('reduceMotion', e.target.checked)} />
              Reducir movimiento
            </label>
            <label>
              <input type="checkbox" checked={settings.largeText} onChange={(e) => setSetting('largeText', e.target.checked)} />
              Texto más grande
            </label>
            <p>Todo funciona con teclado: Tab para moverte, flechas en la repisa y Enter para elegir.</p>
          </div>
        )}
      </header>

      <main className="cab-main">
        <section className="lado-tlalli" aria-label="Tlalli">
          <WindowArt />
          <Bubbles
            messages={messages}
            canAdvance={guide !== null}
            isLast={guide !== null && guide.index === lines.length - 1}
            onNext={nextLine}
            onSkip={skipGuide}
          />
          <div className="tlalli-lugar">
            <TlalliArt listening={playing} />
          </div>
        </section>

        <section className="lado-mueble" aria-label="Vinilos y tocadiscos">
          <Shelf
            discs={DISCS}
            selectedId={selectedId}
            currentId={currentId}
            draggingId={drag?.id ?? flight?.disc.id ?? null}
            registerCover={registerCover}
            onSelect={select}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
          />
          <DiscInfo
            disc={selected}
            isCurrent={selected !== null && selected.id === currentId}
            playing={playing}
            onPlace={(d) => place(d, true)}
            onToggle={toggle}
          />
          <div className="consola">
            <div className="consola-encima">
              <Turntable
                disc={current}
                playing={playing}
                dropState={drag ? (drag.over ? 'over' : 'target') : 'idle'}
                register={registerTurntable}
                onClick={toggle}
              />
              <NowPlaying disc={current} playing={playing} frame={frame} onToggle={toggle} onEject={eject} />
            </div>
            <div className="consola-cuerpo cosido" aria-hidden="true">
              <span className="perilla" />
              <span className="perilla" />
            </div>
          </div>
        </section>
      </main>

      <p className="cab-credito">Prototipo con datos de ejemplo · Imágenes y datos: NASA Earth Information Center</p>

      {drag && dragged && (
        <div className="volador" aria-hidden="true" style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }}>
          <RecordArt color={dragged.color} />
        </div>
      )}
      {flight && (
        <div
          ref={flyEl}
          className="volador-auto"
          aria-hidden="true"
          style={{ left: flight.from.left, top: flight.from.top, width: flight.from.width, height: flight.from.height }}
        >
          <RecordArt color={flight.disc.color} />
        </div>
      )}
    </div>
  )
}
