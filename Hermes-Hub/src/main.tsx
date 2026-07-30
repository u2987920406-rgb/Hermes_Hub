import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Apply the last known theme before the first paint; the server config takes
// over on bootstrap. Without this the app flashes light then switches to dark.
try {
  const stored = localStorage.getItem('hermes-hub-theme')
  if (stored === 'dark') document.documentElement.classList.add('dark')
} catch {
  /* private mode */
}

createRoot(document.getElementById('root')!).render(<App />)
