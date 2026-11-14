export interface Message {
  id: number
  text: string
}

/** Globos de texto: el más reciente entra con animación; el anterior queda atenuado arriba. */
export function Bubbles(props: {
  messages: Message[]
  canAdvance: boolean
  isLast: boolean
  onNext: () => void
  onSkip: () => void
}) {
  const { messages, canAdvance, isLast, onNext, onSkip } = props
  const newest = messages[messages.length - 1]
  const older = messages.length > 1 ? messages[messages.length - 2] : null

  return (
    <div className="globos">
      {older && (
        <p key={older.id} className="globo fieltro cosido is-old" aria-hidden="true">
          {older.text}
        </p>
      )}
      <div aria-live="polite">
        <p key={newest.id} className="globo fieltro cosido is-new">
          <span className="globo-nombre">Tlalli</span>
          {newest.text}
        </p>
      </div>
      {canAdvance && (
        <div className="globo-acciones">
          <button type="button" className="btn-fieltro fieltro cosido" onClick={onNext}>
            {isLast ? 'Entendido' : 'Siguiente'}
          </button>
          {!isLast && (
            <button type="button" className="btn-texto" onClick={onSkip}>
              Saltar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
