// Vista 1: el tocadiscos. Une los datos (src/data), el audio (src/audio) y los
// componentes del tocadiscos (src/components).
// ESQUELETO: la lógica y la accesibilidad básica están conectadas; el diseño lo agrega Frontend.

import { useEffect, useState } from 'react'
import * as audio from '../../audio'
import SpeakerGrid from '../../components/SpeakerGrid'
import Tonearm from '../../components/Tonearm'
import VinylDisc from '../../components/VinylDisc'
import type { Disc, DiscId } from '../../data/discs'
import { DISC_IDS, fetchDisc } from '../../data/discs'
import './TurntableHub.css'

const LABELS: Record<DiscId, string> = {
  sst: 'Temperatura del mar',
  co2: 'Dióxido de carbono',
}

export default function TurntableHub() {
  const [discId, setDiscId] = useState<DiscId>(DISC_IDS[0])
  const [disc, setDisc] = useState<Disc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [frameIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState<audio.Mode>('scan')

  useEffect(() => {
    let cancelled = false
    fetchDisc(discId)
      .then((d) => {
        if (cancelled) return
        setDisc(d)
        setError(null)
        audio.loadDisc(d)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [discId])

  function chooseDisc(id: DiscId) {
    audio.pause()
    setPlaying(false)
    setDisc(null)
    setDiscId(id)
  }

  async function togglePlay() {
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      await audio.play()  // dentro del clic: aquí Audio llama a Tone.start()
      setPlaying(true)
    }
  }

  function toggleMode() {
    const next = mode === 'scan' ? 'region' : 'scan'
    audio.setMode(next)
    setMode(next)
  }

  const frame = disc?.frames[frameIndex]

  return (
    <main className="turntable-hub">
      <nav className="turntable-hub__discs" aria-label="Discos">
        {DISC_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={id === discId}
            onClick={() => chooseDisc(id)}
          >
            {LABELS[id]}
          </button>
        ))}
      </nav>

      <section className="turntable-hub__deck" aria-label="Tocadiscos">
        <VinylDisc disc={disc} frameIndex={frameIndex} spinning={playing} />
        <Tonearm playing={playing} />
      </section>

      <SpeakerGrid label="Controles">
        <button type="button" onClick={togglePlay} disabled={!disc}>
          {playing ? 'Pausar' : 'Reproducir'}
        </button>
        <button type="button" onClick={toggleMode} disabled={!disc}>
          {mode === 'scan' ? 'Modo: barrido' : 'Modo: lugar'}
        </button>
      </SpeakerGrid>

      {/* Se lee solo cuando cambia el fotograma, no en cada nota */}
      <p className="turntable-hub__live" aria-live="polite">
        {error ?? frame?.text ?? 'Cargando disco…'}
      </p>
    </main>
  )
}
