# UI showcase

A "storybook"-type area demonstrating every component in the UI library (`src/ui/`), living inside the app but **not shipped with it** — see the isolation notes below.

## Accessing it

The showcase lives behind one route:

- Run the dev server (`npm run dev`) and open **`http://localhost:5173/#/showcase`**.
- Individual sections are linkable: `#/showcase/buttons`, `#/showcase/selectors`, `#/showcase/feedback`, … (any unknown section falls back to the first one).
- It works the same in a production build (`npm run build && npm run preview`) — same `#/showcase` route.

The default route (`/` or `#/home`) is the real app — the showcase never appears unless you navigate to its route.

The menu's **Full page** group links out to the real app's routes (`#/home`, `#/login`, `#/outbound-shipments`) so pages can be device-tested exactly as shipped; use the browser's Back button to return to the showcase.

## Isolation

Nothing in the library (`src/ui/`) or real pages (`src/pages/`) may import from this folder — the dependency arrow only points the other way. The one place the app touches it is the lazy route in [`src/App.tsx`](../App.tsx):

```tsx
const ShowcaseApp = lazy(() => import('./ui-showcase/ShowcaseApp'))
```

Because that's a dynamic import, Vite splits everything under `src/ui-showcase/` into its own chunk which is only fetched when someone visits `#/showcase` — the app's main bundle contains none of it.

## Adding a section

Add an entry to the registry in [`sections.tsx`](./sections.tsx) (id, label, component, menu category) and create the matching `<Name>Showcase.tsx` (+ optional `.module.css`) beside it. The shell derives the menu and panels from the registry; the section id becomes its hash.
