import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import * as audio from './audio'
import { DISCS, localizeDisc } from './data/discs'
import type { Disc, DiscId } from './data/discs'
import { COLS, audioFrames, loadDiscData } from './data/realData'
import type { DataMap } from './data/realData'
import { useSettings } from './hooks/useSettings'
import mosaico from './assets/fieltro/mosaico.webp'
import { RecordImg, TlalliImg } from './components/Felt'
import { NowPlaying, Turntable } from './components/Console'
import { DiscInfo, Shelf } from './components/Shelf'
import { Bubbles } from './components/Tlalli'
import { Pizarron } from './components/Pizarron'
import { Telon } from './components/Telon'
import { Ventanal } from './components/Ventanal'
import type { Message } from './components/Tlalli'
import { LangContext, pick } from './i18n'
import type { Lang, Text } from './i18n'

// ---- Lo que dice Tlalli ----------------------------------------------------
/** Un texto en español y en inglés; el globo lo escribe en el idioma que esté puesto. */
const tx = (es: string, en: string): Text => (l) => pick(l, es, en)

const INTRO: Text[] = [
  tx('Hola, soy Tlalli, «tierra» en náhuatl. Bienvenido a mi cabaña en órbita.', 'Hi, I’m Tlalli, “earth” in Nahuatl. Welcome to my cabin in orbit.'),
  tx('Los satélites de la NASA me observan. Con lo que ven, hice música.', 'NASA satellites watch over me. With what they see, I made music.'),
  tx(
    'Cada vinilo guarda una parte de mí: mi mar, mis bosques, mi aire, mi hielo, mi lluvia, mi fuego y mi calor. Haz clic en uno.',
    'Each record holds a part of me: my sea, my forests, my air, my ice, my rain, my fire and my heat. Click one.',
  ),
  tx('Luego arrástralo al tocadiscos, o pulsa el botón de reproducir.', 'Then drag it to the turntable, or press the play button.'),
  tx(
    'Cuando un disco esté sonando, pulsa «Conocer más» y te llevo al pizarrón a ver sus números.',
    'When a record is playing, press “Learn more” and I’ll take you to the blackboard to see its numbers.',
  ),
]
const HOW_TO: Text[] = [
  tx('La altura: notas agudas, valores altos; notas graves, valores bajos.', 'Pitch: high notes, high values; low notes, low values.'),
  tx('La tensión: si suena incómodo, me alejé de lo normal.', 'Tension: if it sounds uneasy, I drifted away from normal.'),
  tx('El lugar: con audífonos, el sonido viaja de oeste a este.', 'Place: with headphones, the sound travels from west to east.'),
  tx(
    'El ritmo: una zona pareja suena con notas largas; una muy variada, con notas rápidas.',
    'Rhythm: an even area plays long notes; a very varied one, quick notes.',
  ),
  tx('El tempo: si el mapa cambia mucho entre fechas, la música se acelera.', 'Tempo: if the map changes a lot between dates, the music speeds up.'),
]
// Ejemplo de la leyenda sonora (src/audio/legend.ts) que acompaña cada línea de HOW_TO.
const HOW_TO_SOUND = ['pitch', 'tension', 'pan', 'density', 'tempo']

type Guide = { kind: 'intro' | 'howto'; index: number } | null
type Drag = { id: DiscId; x: number; y: number; over: boolean }
type Flight = { disc: Disc; from: DOMRect; to: DOMRect }
type View = 'sala' | 'pizarron'
type Walk = 'derecha' | 'izquierda' | null

const DISC_IDS = DISCS.map((d) => d.id)
/** Los textos de un vinilo en el idioma pedido (para lo que dice Tlalli). */
const discText = (id: DiscId, l: Lang) => localizeDisc(DISCS.find((d) => d.id === id)!, l)
const WALK_MS = 1400 // lo que dura el paseo de Tlalli (igual que la transición en pizarron.css)

const VIGA = 'M34 900 V210 Q34 52 220 34 H1220 Q1406 52 1406 210 V900'

export default function App() {
  const [settings, setSetting] = useSettings()
  const lang = settings.lang

  useEffect(() => {
    audio.setVolume(settings.volume)
  }, [settings.volume])
  const t = (es: string, en: string) => pick(lang, es, en)
  const [messages, setMessages] = useState<Message[]>([{ id: 0, text: INTRO[0] }])
  const [guide, setGuide] = useState<Guide>({ kind: 'intro', index: 0 })
  const [selectedId, setSelectedId] = useState<DiscId | null>(null)
  const [currentId, setCurrentId] = useState<DiscId | null>(null)
  const [playing, setPlaying] = useState(false)
  const [frame, setFrame] = useState(0)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [flight, setFlight] = useState<Flight | null>(null)
  const [a11yOpen, setA11yOpen] = useState(false)
  const [data, setData] = useState<DataMap>({})
  const [dataErrors, setDataErrors] = useState<Partial<Record<DiscId, string>>>({})
  const [view, setView] = useState<View>('sala')
  const [walking, setWalking] = useState<Walk>(null)
  const [landing, setLanding] = useState(false) // Tlalli acaba de llegar y guarda sus pies
  const [telon, setTelon] = useState<'puesto' | 'abriendo' | 'fuera'>('puesto') // cortina de entrada
  const [listenCell, setListenCell] = useState<number | null>(null) // celda del modo "lugar en el tiempo"

  const nextId = useRef(1)
  const covers = useRef(new Map<DiscId, HTMLButtonElement>())
  const turntable = useRef<HTMLButtonElement | null>(null)
  const pointer = useRef<{ id: DiscId; x: number; y: number; active: boolean } | null>(null)
  const suppressClick = useRef(false)
  const tenseSaid = useRef(new Set<DiscId>())
  const flyEl = useRef<HTMLDivElement | null>(null)
  const walkTimer = useRef<number | undefined>(undefined)
  const landTimer = useRef<number | undefined>(undefined)
  const loadToken = useRef(0) // descarta cargas de un disco que ya se quitó del plato

  // ---- Datos reales: los disc.json que escribe pipeline/ ----------------------
  useEffect(() => {
    let alive = true
    DISC_IDS.forEach((id) => {
      loadDiscData(id).then(
        (d) => alive && setData((prev) => ({ ...prev, [id]: d })),
        (e: unknown) => alive && setDataErrors((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : String(e) })),
      )
    })
    return () => {
      alive = false
    }
  }, [])

  // Cada vinilo suena con los números de su disc.json en cuanto llegan.
  const discs = useMemo(
    () =>
      DISCS.map((base) => {
        const d = localizeDisc(base, lang)
        const real = data[d.id]
        return real ? { ...d, frames: audioFrames(real), real: true } : d
      }),
    [data, lang],
  )
  const discById = useCallback((id: DiscId | null) => discs.find((d) => d.id === id) ?? null, [discs])

  const selected = discById(selectedId)
  const current = discById(currentId)
  const shownFrame = current ? frame % current.frames.length : 0

  const say = useCallback((text: Text) => {
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
      say(
        guide.kind === 'intro'
          ? tx('Elige un vinilo del buró cuando quieras.', 'Pick a record from the cabinet whenever you like.')
          : tx('Eso es todo. Pon un disco y compruébalo.', 'That’s all. Put on a record and hear for yourself.'),
      )
      return
    }
    setGuide({ ...guide, index: i })
    say(lines[i])
    if (guide.kind === 'howto') void audio.playLegend(HOW_TO_SOUND[i])
  }
  const skipGuide = () => {
    setGuide(null)
    say(tx('Está bien. Elige un vinilo del buró cuando quieras.', 'All right. Pick a record from the cabinet whenever you like.'))
  }
  const startHowTo = () => {
    setGuide({ kind: 'howto', index: 0 })
    say(HOW_TO[0])
    void audio.playLegend(HOW_TO_SOUND[0])
  }

  // ---- Pasear al pizarrón y volver ----------------------------------------
  // Tlalli camina a la derecha; la cabaña se desliza y aparece el pizarrón (pizarron.css).
  const walk = (to: View, dir: Exclude<Walk, null>, focusSelector: string) => {
    window.clearTimeout(walkTimer.current)
    setView(to)
    setGuide(null)
    const ms = settings.reduceMotion ? 0 : WALK_MS
    setWalking(ms ? dir : null)
    setLanding(false)
    window.clearTimeout(landTimer.current)
    walkTimer.current = window.setTimeout(() => {
      setWalking(null)
      if (ms) {
        setLanding(true)
        landTimer.current = window.setTimeout(() => setLanding(false), 560)
      }
      document.querySelector<HTMLElement>(focusSelector)?.focus({ preventScroll: true })
    }, ms)
  }
  useEffect(
    () => () => {
      window.clearTimeout(walkTimer.current)
      window.clearTimeout(landTimer.current)
    },
    [],
  )

  // El pizarrón siempre muestra el disco que está en el tocadiscos.
  const learnMore = (d: Disc) => {
    walk('pizarron', 'derecha', '.piz-volver')
    say((l) =>
      pick(
        l,
        `Vamos al pizarrón. Toca cualquier lugar del mapa y te cuento cómo está ${discText(d.id, l).about}.`,
        `Let’s go to the blackboard. Tap any place on the map and I’ll tell you about ${discText(d.id, l).about}.`,
      ),
    )
  }
  const backToTurntable = () => {
    walk('sala', 'izquierda', '.ficha .btn-conocer, .funda.is-selected, .funda')
    say(tx('De vuelta al tocadiscos.', 'Back to the turntable.'))
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
    say((l) => {
      const x = discText(id, l)
      return pick(l, `«${x.title}» guarda ${x.about}. ¿Lo ponemos?`, `“${x.title}” holds ${x.about}. Shall we play it?`)
    })
  }

  const finishPlace = useCallback(
    (d: Disc) => {
      setFlight(null)
      setCurrentId(d.id)
      setSelectedId(d.id)
      setFrame(0)
      setListenCell(null)
      setPlaying(true)
      say((l) => discText(d.id, l).listen)
      // El motor toca el disc.json del pipeline tal cual (Contrato 1).
      const token = ++loadToken.current
      loadDiscData(d.id).then(
        (real) => {
          if (token !== loadToken.current) return
          audio.loadDisc(real)
          audio.setMode('scan')
          void audio.play()
        },
        () => {
          if (token !== loadToken.current) return
          setPlaying(false)
          say(tx('No pude leer los datos de este disco. Prueba con otro.', 'I couldn’t read this record’s data. Try another one.'))
        },
      )
    },
    [say],
  )

  const place = (d: Disc, animate: boolean) => {
    void audio.start() // este clic es el que le permite al navegador sonar
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
    const targetX = to.left + to.width * (140 / 320) - (from.left + size / 2)
    const targetY = to.top + to.height * (113 / 250) - (from.top + size / 2)
    const scale = (to.width * (216 / 320)) / size
    const anim = el.animate(
      [
        { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
        { transform: `translate(${targetX * 0.5}px, ${targetY * 0.5 - 90}px) scale(${(1 + scale) / 2}) rotate(-200deg)`, offset: 0.55 },
        { transform: `translate(${targetX}px, ${targetY}px) scale(${scale}, ${scale * 0.24}) rotate(0deg)` },
      ],
      { duration: 800, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' },
    )
    anim.onfinish = () => finishPlace(disc)
    return () => anim.cancel()
  }, [flight, finishPlace])

  const toggle = () => {
    if (!current) {
      say(tx('El tocadiscos está vacío. Elige un vinilo.', 'The turntable is empty. Choose a record.'))
      return
    }
    if (playing) {
      audio.pause()
      setPlaying(false)
      say(tx('Pausa. Aquí te espero.', 'Paused. I’ll wait for you here.'))
    } else {
      void audio.play()
      setPlaying(true)
    }
  }

  const eject = () => {
    loadToken.current++
    audio.pause()
    setPlaying(false)
    setCurrentId(null)
    setListenCell(null)
    say(tx('Listo, lo guardé en su funda. ¿Cuál sigue?', 'Done, I put it back in its sleeve. Which one is next?'))
  }

  // El motor decide cuándo cambia el fotograma (al terminar cada barrido) y avisa aquí,
  // así la imagen y el texto siguen a la música.
  const currentRef = useRef(current)
  useEffect(() => {
    currentRef.current = current
  }, [current])
  useEffect(
    () =>
      audio.onFrame((next) => {
        setFrame(next)
        const c = currentRef.current
        const f = c?.frames[next]
        if (c && f && Math.abs(f.anomaly) > 0.7 && !tenseSaid.current.has(c.id)) {
          tenseSaid.current.add(c.id)
          say(tx('¿Oyes cómo se tensa la armonía? Ahí me alejé de lo normal.', 'Hear how the harmony gets tense? That’s where I drifted away from normal.'))
        }
      }),
    [say],
  )
  useEffect(() => () => audio.pause(), [])

  // Modo "lugar en el tiempo": el pizarrón elige una celda y suena sola a lo largo de las fechas.
  const listenAt = (cell: number | null) => {
    setListenCell(cell)
    if (cell === null) {
      audio.setMode('scan')
      say(tx('De vuelta al barrido: el sonido viaja de oeste a este.', 'Back to the sweep: the sound travels from west to east.'))
      return
    }
    audio.setRegion(cell % COLS, Math.floor(cell / COLS))
    audio.setMode('region')
    if (!playing) {
      void audio.play()
      setPlaying(true)
    }
    say(tx('Ahora oyes solo ese lugar, fecha tras fecha.', 'Now you hear only that place, date after date.'))
  }

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
      say(tx('Eso, suéltalo sobre el tocadiscos.', 'That’s it, drop it on the turntable.'))
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
    else say(tx('Casi. Suéltalo encima del tocadiscos.', 'Almost. Drop it right on the turntable.'))
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

  const openTelon = useCallback(() => setTelon('abriendo'), [])
  const removeTelon = useCallback(() => setTelon('fuera'), [])

  return (
    <LangContext.Provider value={lang}>
    {telon !== 'fuera' && <Telon still={settings.reduceMotion} onOpen={openTelon} onGone={removeTelon} />}
    {/* Mientras el telón está puesto, la cabaña no recibe foco ni la leen los lectores de pantalla */}
    <div
      className={`cabana vista-${view}${walking ? ` is-paseando-${walking}` : ''}${drag ? ' is-dragging' : ''}${telon !== 'fuera' ? ' con-telon' : ''}`}
      inert={telon === 'puesto'}
    >
      <div className="cabin" aria-hidden="true">
        <svg className="cabin-arco" viewBox="0 0 1440 900" preserveAspectRatio="none">
          <defs>
            <pattern id="tela-viga" patternUnits="userSpaceOnUse" width="300" height="300">
              <rect width="300" height="300" fill="#8A6644" />
              <image href={mosaico} width="300" height="300" opacity=".22" />
            </pattern>
          </defs>
          {/* viga de madera clara (pino): sombra, canto, tira de fieltro y puntadas sueltas */}
          <path d={VIGA} fill="none" stroke="#140C08" strokeOpacity=".32" strokeWidth="36" vectorEffect="non-scaling-stroke" />
          <path d={VIGA} fill="none" stroke="#6E5035" strokeWidth="26" vectorEffect="non-scaling-stroke" />
          <path d={VIGA} fill="none" stroke="url(#tela-viga)" strokeWidth="22" vectorEffect="non-scaling-stroke" />
          <path d={VIGA} fill="none" stroke="#F1F1EC" strokeOpacity=".55" strokeWidth="2" strokeDasharray="2 12" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="cabin-luces" />
        <div className="cabin-piso" />
      </div>

      <header className="cab-header">
        <a className="logo" href={import.meta.env.BASE_URL} aria-label={t('Socotlalli, ir al inicio', 'Socotlalli, go to the home page')}>
          Socotlalli
        </a>
        <nav aria-label={t('Opciones', 'Options')} className="cab-nav">
          <button type="button" className="btn-texto" onClick={startHowTo}>
            {t('Cómo se escucha', 'How to listen')}
          </button>
          <button type="button" className="btn-texto" aria-expanded={a11yOpen} aria-controls="panel-a11y" onClick={() => setA11yOpen((o) => !o)}>
            {t('Accesibilidad', 'Accessibility')}
          </button>
          {/* Interruptor de idioma: el lado claro es el idioma activo */}
          <div className="idioma" role="group" aria-label={t('Idioma', 'Language')}>
            {(['en', 'es'] as const).map((l) => (
              <button
                key={l}
                type="button"
                lang={l}
                className={`idioma-opcion${lang === l ? ' is-on' : ''}`}
                aria-pressed={lang === l}
                aria-label={l === 'en' ? 'English' : 'Español'}
                onClick={() => setSetting('lang', l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </nav>
        {/* Siempre está en la página para poder animar su entrada y salida (cabana.css) */}
        <div id="panel-a11y" className={`a11y-panel fieltro cosido${a11yOpen ? ' is-open' : ''}`} inert={!a11yOpen}>
          <label>
            <input type="checkbox" checked={settings.reduceMotion} onChange={(e) => setSetting('reduceMotion', e.target.checked)} />
            {t('Reducir movimiento', 'Reduce motion')}
          </label>
          <label>
            <input type="checkbox" checked={settings.largeText} onChange={(e) => setSetting('largeText', e.target.checked)} />
            {t('Texto más grande', 'Larger text')}
          </label>
          <label className="a11y-volumen">
            {t('Volumen', 'Volume')}
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(settings.volume * 100)}
              aria-valuetext={`${Math.round(settings.volume * 100)}%`}
              onChange={(e) => setSetting('volume', Number(e.target.value) / 100)}
            />
          </label>
          <p>
            {t(
              'Todo funciona con teclado: Tab para moverte, flechas entre los vinilos y Enter para elegir.',
              'Everything works with the keyboard: Tab to move, arrow keys between the records and Enter to choose.',
            )}
          </p>
        </div>
      </header>

      <main className="cab-main">
        <section className="lado-tlalli" aria-label="Tlalli">
          <Bubbles
            messages={messages}
            canAdvance={guide !== null}
            isLast={guide !== null && guide.index === lines.length - 1}
            onNext={nextLine}
            onSkip={skipGuide}
          />
          <div className="tlalli-lugar">
            <TlalliImg
              listening={playing}
              walking={walking}
              landing={landing}
              still={settings.reduceMotion}
              onLaugh={() => say(tx('¡Ja, ja, ja! Me haces cosquillas.', 'Ha, ha, ha! That tickles.'))}
            />
          </div>
          <div className="tapete" aria-hidden="true" />
        </section>

        <div className="escenario">
        <section className="lado-mueble" aria-label={t('Vinilos y tocadiscos', 'Records and turntable')} inert={view !== 'sala'}>
          {/* El cielo del ventanal sigue al disco que está en el tocadiscos */}
          <Ventanal disc={current} playing={playing} frame={shownFrame} still={settings.reduceMotion}>
            <DiscInfo
              disc={selected}
              isCurrent={selected !== null && selected.id === currentId}
              onPlace={(d) => place(d, true)}
              onLearn={learnMore}
            />
          </Ventanal>
          <div className="buro">
            <div className="buro-encima">
              <Turntable
                disc={current}
                playing={playing}
                dropState={drag ? (drag.over ? 'over' : 'target') : 'idle'}
                register={registerTurntable}
                onClick={toggle}
              />
              <Shelf
                discs={discs}
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
            </div>
            <div className="buro-tapa" aria-hidden="true" />
            <div className="buro-cuerpo">
              <div className="cajon cosido">
                <span className="perilla" aria-hidden="true" />
                <NowPlaying disc={current} playing={playing} frame={shownFrame} onToggle={toggle} onEject={eject} />
                <span className="perilla" aria-hidden="true" />
              </div>
            </div>
            <div className="buro-patas" aria-hidden="true">
              <span />
              <span />
            </div>
          </div>
        </section>

        {current && (
          <Pizarron
            key={current.id}
            disc={current}
            data={data}
            error={dataErrors[current.id]}
            playing={playing}
            playingFrame={shownFrame}
            active={view === 'pizarron'}
            onBack={backToTurntable}
            onSay={say}
            listenCell={listenCell}
            onListen={listenAt}
          />
        )}
        </div>
      </main>

      <p className="cab-credito">
        {t('Imágenes y datos', 'Images and data')}: NASA Scientific Visualization Studio · NASA Earth Information Center
      </p>

      {drag && dragged && (
        <div className="volador" aria-hidden="true" style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }}>
          <RecordImg id={dragged.id} />
        </div>
      )}
      {flight && (
        <div
          ref={flyEl}
          className="volador-auto"
          aria-hidden="true"
          style={{ left: flight.from.left, top: flight.from.top, width: flight.from.width, height: flight.from.height }}
        >
          <RecordImg id={flight.disc.id} />
        </div>
      )}
    </div>
    </LangContext.Provider>
  )
}
