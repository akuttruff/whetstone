import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { registerAppShell } from './lib/appShell.ts'

// The page from the cache on later launches, so it paints before the network answers.
registerAppShell()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
