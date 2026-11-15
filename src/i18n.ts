// Idioma de la interfaz: español (por defecto) o inglés.
// Los textos viven junto a su versión en español, como pares t('es', 'en'),
// para que sea fácil ver y mantener las dos a la vez.
import { createContext, useContext } from 'react'

export type Lang = 'es' | 'en'

export const LangContext = createContext<Lang>('es')

export const useLang = () => useContext(LangContext)

/** Elige el texto del idioma actual. */
export const pick = (lang: Lang, es: string, en: string) => (lang === 'en' ? en : es)

/** Dentro de un componente: const t = useT(); t('Hola', 'Hello'). */
export function useT() {
  const lang = useLang()
  return (es: string, en: string) => pick(lang, es, en)
}

/** Un texto que se puede volver a escribir en el otro idioma (los globos de Tlalli). */
export type Text = (lang: Lang) => string
