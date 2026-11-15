import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/cabana.css'
import './styles/tlalli.css'
import './styles/pizarron.css'
import './styles/telon.css'
import './styles/ventanal.css'
import App from './App.tsx'
import TestPlayer from './ui/test/TestPlayer.tsx'

// Página de prueba del motor de audio: abrir con /#test
const isTest = window.location.hash === '#test'

// La app se dibuja de inmediato: lo primero que se ve es el telón de entrada, que espera a que
// carguen la fuente, las piezas de fieltro y los datos (hooks/useLoadProgress.ts).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isTest ? <TestPlayer /> : <App />}
  </StrictMode>,
)
