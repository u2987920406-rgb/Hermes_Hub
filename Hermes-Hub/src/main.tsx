import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Apply the last known theme before the first paint; the server config takes
// over on bootstrap. Without this the app flashes light then switches to dark.
try {
  const stored = localStorage.getItem('hermes-hub-theme')
  if (stored === 'dark' || stored === 'antique') {
    document.documentElement.classList.add(stored)
  }
} catch {
  /* private mode */
}

createRoot(document.getElementById('root')!).render(<App />)
