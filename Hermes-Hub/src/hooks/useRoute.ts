import { useCallback, useEffect, useState } from 'react'
import type { View } from '../types'

export interface Route {
  view: View
  param: string | null
}

const VIEWS: View[] = ['home', 'agora', 'projects', 'project', 'clean', 'vault', 'trash', 'config']

/** La Discussion a fusionne avec l'Agora : `#/chat` reste valide pour les
    onglets ouverts et les favoris poses avant la fusion. */
const ALIAS: Record<string, View> = { chat: 'agora' }

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const brut = ALIAS[parts[0]] || parts[0]
  const view = (VIEWS.includes(brut as View) ? brut : 'home') as View
  const param = parts[1] ? decodeURIComponent(parts[1]) : null
  return { view, param }
}

/** Hash routing so a refresh (or a bookmark) lands on the same screen. */
export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))

  useEffect(() => {
    const onHash = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = useCallback((view: View, param?: string) => {
    window.location.hash = param ? `/${view}/${encodeURIComponent(param)}` : `/${view}`
  }, [])

  return { route, navigate }
}
