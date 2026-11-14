import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import TestPlayer from './ui/test/TestPlayer.tsx'

// Página de prueba del motor de audio: abrir con /#test
const isTest = window.location.hash === '#test'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isTest ? <TestPlayer /> : <App />}
  </StrictMode>,
)
