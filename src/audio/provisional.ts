// Motor de audio PROVISIONAL con Web Audio: la interfaz lo usa mientras se conecta el motor real (index.ts).
// El equipo de Audio lo reemplaza con Tone.js conservando esta misma interfaz.
import type { Disc } from '../data/discs'

export interface NoteEvent {
  midi: number
  tension: number
  pan: number
}

type Listener = (n: NoteEvent) => void

export interface AudioEngine {
  start(): Promise<void> // llamar dentro de un clic: el navegador lo exige
  loadDisc(disc: Disc): void
  setFrame(index: number): void
  play(): void
  pause(): void
  onNote(cb: Listener): () => void
  preview(rule: number): void // ejemplos de "Cómo se escucha"
}

const SCALE = [0, 2, 4, 7, 9] // pentatónica mayor
const STEPS = 16

function createEngine(): AudioEngine {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let disc: Disc | null = null
  let frame = 0
  let step = 0
  let playing = false
  let timer: number | undefined
  const listeners = new Set<Listener>()

  const ensure = () => {
    if (!ctx) {
      ctx = new AudioContext()
      master = ctx.createGain()
      master.gain.value = 0.128
      master.connect(ctx.destination)
    }
    return ctx
  }

  const voice = (midi: number, when: number, dur: number, pan: number, type: OscillatorType, gain = 0.45) => {
    const c = ensure()
    if (!master) return
    const osc = c.createOscillator()
    osc.type = type
    osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12)
    const filter = c.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = type === 'sawtooth' || type === 'square' ? 1400 : 4000
    const env = c.createGain()
    env.gain.setValueAtTime(0, when)
    env.gain.linearRampToValueAtTime(gain, when + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    const panner = c.createStereoPanner()
    panner.pan.value = Math.max(-1, Math.min(1, pan))
    osc.connect(filter).connect(env).connect(panner).connect(master)
    osc.start(when)
    osc.stop(when + dur + 0.05)
  }

  const tick = () => {
    if (!disc || !ctx) return
    const f = disc.frames[frame]
    const x = (step % STEPS) / (STEPS - 1) // barrido de oeste a este
    step += 1
    // Densidad rítmica: más variación, más notas.
    if (Math.random() > 0.35 + 0.65 * f.variation) return
    // Altura: valor más alto, nota más aguda.
    const deg = Math.max(0, Math.min(9, Math.round(f.value * 9 + (x - 0.5) * 3 + (Math.random() - 0.5) * 2)))
    const midi = disc.baseMidi + 12 * Math.floor(deg / 5) + SCALE[deg % 5]
    const pan = x * 2 - 1
    const tension = Math.abs(f.anomaly)
    const now = ctx.currentTime + 0.02
    voice(midi, now, 1.4, pan, disc.wave)
    // Tensión: cerca de lo normal, quinta; luego sexta; lejos, novena. Todo consonante.
    if (Math.random() < 0.25 + tension * 0.75) {
      const interval = tension > 0.66 ? 14 : tension > 0.33 ? 9 : 7
      voice(midi + interval, now + 0.01, 1.2, pan, disc.wave, 0.3)
    }
    listeners.forEach((cb) => cb({ midi, tension, pan }))
  }

  const schedule = () => {
    window.clearInterval(timer)
    if (!playing || !disc) return
    const bpm = 60 + 60 * disc.frames[frame].change // tempo: cambio entre fotogramas
    timer = window.setInterval(tick, 60000 / bpm / 2)
  }

  return {
    async start() {
      try {
        await ensure().resume()
      } catch {
        // Si el navegador rechaza el audio, la interfaz sigue funcionando sin sonido.
      }
    },
    loadDisc(d) {
      disc = d
      frame = 0
      step = 0
      schedule()
    },
    setFrame(i) {
      if (!disc) return
      frame = Math.max(0, Math.min(disc.frames.length - 1, i))
      step = 0
      schedule()
    },
    play() {
      ensure()
      playing = true
      schedule()
    },
    pause() {
      playing = false
      window.clearInterval(timer)
    },
    onNote(cb) {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    preview(rule) {
      const c = ensure()
      void c.resume()
      const t = c.currentTime + 0.05
      const n = (m: number, at: number, pan = 0, type: OscillatorType = 'triangle') => voice(m, t + at, 1, pan, type)
      if (rule === 0) {
        // graves y luego agudas
        ;[55, 59, 62].forEach((m, i) => n(m, i * 0.35))
        ;[74, 79, 83].forEach((m, i) => n(m, 1.4 + i * 0.35))
      } else if (rule === 1) {
        // acorde limpio y luego tenso
        ;[60, 64, 67].forEach((m) => n(m, 0))
        ;[60, 61, 66].forEach((m) => n(m, 1.4))
      } else {
        // de un oído al otro
        Array.from({ length: 9 }, (_, i) => n(64 + SCALE[i % 5], i * 0.25, -1 + i * 0.25, 'sine'))
      }
    },
  }
}

export const engine = createEngine()
