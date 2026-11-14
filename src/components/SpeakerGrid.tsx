// La rejilla derecha del tocadiscos, con los dos botones.
// ESQUELETO: recibe los botones como children para que la vista decida cuáles van;
// el diseño (textura de rejilla) lo agrega Frontend.

import type { ReactNode } from 'react'

interface SpeakerGridProps {
  label: string        // nombre para el lector de pantalla, p. ej. "Controles"
  children: ReactNode  // los dos botones
}

export default function SpeakerGrid({ label, children }: SpeakerGridProps) {
  return (
    <section className="speaker-grid" aria-label={label}>
      {children}
    </section>
  )
}
