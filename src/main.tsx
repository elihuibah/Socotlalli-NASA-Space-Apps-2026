import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/cabana.css'
import './styles/tlalli.css'
import './styles/pizarron.css'
import './styles/telon.css'
import App from './App.tsx'
import TestPlayer from './ui/test/TestPlayer.tsx'

// Página de prueba del motor de audio: abrir con /#test
const isTest = window.location.hash === '#test'

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {isTest ? <TestPlayer /> : <App />}
    </StrictMode>,
  )
}

// La página se dibuja cuando Urbanist ya cargó, para que el texto no aparezca primero con
// otra letra y luego cambie. Si la fuente tarda más de 1.5 s, se dibuja de todos modos.
const fontReady = document.fonts?.load
  ? Promise.race([
      document.fonts.load('500 1em "Urbanist Variable"'),
      new Promise((resolve) => window.setTimeout(resolve, 1500)),
    ]).catch(() => undefined)
  : Promise.resolve()
void fontReady.then(render)
