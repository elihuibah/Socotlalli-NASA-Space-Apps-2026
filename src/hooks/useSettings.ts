import { useEffect, useState } from 'react'

export interface Settings {
  reduceMotion: boolean
  largeText: boolean
}

const KEY = 'socotlalli:ajustes'

function load(): Settings {
  let system = false
  try {
    system = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    // Sin matchMedia: se asume movimiento completo.
  }
  const base: Settings = { reduceMotion: system, largeText: false }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...base, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    // Sin almacenamiento disponible: valores por defecto.
  }
  return base
}

/** Ajustes de accesibilidad: se recuerdan por navegador y se aplican como atributos en <html>. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      // Ventana privada o almacenamiento bloqueado: duran solo esta visita.
    }
    const root = document.documentElement
    root.dataset.motion = settings.reduceMotion ? 'reduce' : 'full'
    root.dataset.text = settings.largeText ? 'l' : 'm'
  }, [settings])

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  return [settings, update] as const
}
