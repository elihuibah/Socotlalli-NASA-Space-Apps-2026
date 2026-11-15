import { useEffect, useState } from 'react'
import { DISCS } from '../data/discs'
import { loadDiscData } from '../data/realData'

// Todas las piezas de fieltro horneadas (assets/fieltro/*.webp), con su dirección final.
const IMAGES = Object.values(
  import.meta.glob<string>('../assets/fieltro/*.webp', { eager: true, query: '?url', import: 'default' }),
)
const TOTAL = IMAGES.length + DISCS.length + 1 // + la fuente

/** Si algo no llega (red lenta o caída), la cabaña se abre de todos modos a los 8 s. */
const MAX_WAIT_MS = 8000

/**
 * Carga real de lo que la cabaña necesita para verse completa:
 * la fuente Urbanist, las piezas de fieltro (imágenes) y los datos de cada vinilo (disc.json).
 * Cada pieza cuenta al terminar, haya llegado bien o no, para que un fallo no bloquee la entrada.
 */
export function useLoadProgress() {
  const [done, setDone] = useState(0)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    let alive = true
    const tick = () => alive && setDone((n) => n + 1)

    IMAGES.forEach((src) => {
      const img = new Image()
      img.onload = tick
      img.onerror = tick
      img.src = src
    })
    // La fuente: con font-display: block el texto no se ve hasta que llega, así que nunca
    // aparece con otra letra. El telón no se abre antes de tenerla.
    if (document.fonts?.load) document.fonts.load('500 1em "Urbanist Variable"').then(tick, tick)
    else tick()
    // Misma promesa que usa App (loadDiscData guarda en caché): no se descarga dos veces.
    DISCS.forEach((d) => loadDiscData(d.id).then(tick, tick))

    const timer = window.setTimeout(() => alive && setTimedOut(true), MAX_WAIT_MS)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [])

  const ready = timedOut || done >= TOTAL
  return { percent: ready ? 100 : Math.round((Math.min(done, TOTAL) / TOTAL) * 100), ready }
}
