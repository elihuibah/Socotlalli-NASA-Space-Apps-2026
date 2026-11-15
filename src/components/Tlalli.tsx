import { useLang, useT } from '../i18n'
import type { Text } from '../i18n'

export interface Message {
  id: number
  /** Se escribe en el idioma actual: al cambiar de idioma, el globo también cambia. */
  text: Text
}

/**
 * Globos de texto: el más reciente entra con animación y apunta a Tlalli con su pico;
 * el anterior queda atenuado arriba. Los botones de la introducción van dentro del globo,
 * para que nada se interponga entre el globo y Tlalli.
 */
export function Bubbles(props: {
  messages: Message[]
  canAdvance: boolean
  isLast: boolean
  onNext: () => void
  onSkip: () => void
}) {
  const { messages, canAdvance, isLast, onNext, onSkip } = props
  const lang = useLang()
  const t = useT()
  const newest = messages[messages.length - 1]
  const older = messages.length > 1 ? messages[messages.length - 2] : null

  return (
    <div className="globos">
      {older && (
        <p key={older.id} className="globo fieltro cosido is-old" aria-hidden="true">
          {older.text(lang)}
        </p>
      )}
      <div className="globo-vivo" aria-live="polite">
        <div key={newest.id} className="globo fieltro cosido is-new">
          <p>
            <span className="globo-nombre">Tlalli</span>
            {newest.text(lang)}
          </p>
          {canAdvance && (
            <div className="globo-acciones">
              <button type="button" className="btn-fieltro fieltro cosido" onClick={onNext}>
                {isLast ? t('Entendido', 'Got it') : t('Siguiente', 'Next')}
              </button>
              {!isLast && (
                <button type="button" className="btn-texto" onClick={onSkip}>
                  {t('Saltar', 'Skip')}
                </button>
              )}
            </div>
          )}
          <span className="globo-pico" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
