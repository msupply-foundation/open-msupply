import { createSignal, onCleanup, lazy, Show, Suspense, type Component } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { Home } from './pages/Home/Home'
import { Login } from './pages/Login/Login'
import { OutboundShipments } from './pages/OutboundShipments/OutboundShipments'

/*
 * The app's router stand-in (routing library still undecided — same hash
 * convention the pages already use): one hashchange listener maps #/<route>
 * to a real page, defaulting to Home. Each page owns its own AppShell for
 * now; a real router takes this file over later.
 *
 * The component showcase is NOT part of the app: it lives behind #/showcase
 * via lazy(), so Vite splits src/ui-showcase/ into its own chunk that only
 * ever loads if that route is visited (see src/ui-showcase/README.md).
 */

const ShowcaseApp = lazy(() =>
  import('./ui-showcase/ShowcaseApp').then((m) => ({ default: m.ShowcaseApp }))
)

const PAGES: Record<string, Component> = {
  home: Home,
  login: Login,
  'outbound-shipments': OutboundShipments,
}

const routeFromHash = (): string => {
  const path = window.location.hash.replace(/^#\/?/, '')
  if (path === 'showcase' || path.startsWith('showcase/')) return 'showcase'
  const id = path.split('/')[0]
  return id in PAGES ? id : 'home'
}

export function App() {
  const [route, setRoute] = createSignal(routeFromHash())

  const onHashChange = () => setRoute(routeFromHash())
  window.addEventListener('hashchange', onHashChange)
  onCleanup(() => window.removeEventListener('hashchange', onHashChange))

  return (
    <Show when={route() === 'showcase'} fallback={<Dynamic component={PAGES[route()]} />}>
      <Suspense>
        <ShowcaseApp />
      </Suspense>
    </Show>
  )
}
