import { useCallback, useEffect, useState } from 'react'
import type { View } from '../types'

export interface Route {
  view: View
  param: string | null
}

const VIEWS: View[] = ['home', 'projects', 'project', 'clean', 'vault', 'trash', 'config']

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const view = (VIEWS.includes(parts[0] as View) ? parts[0] : 'home') as View
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
