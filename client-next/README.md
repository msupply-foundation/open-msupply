# client-next

A from-scratch rewrite of the open-mSupply web client. See
[`../client/client-next-plan.md`](../client/client-next-plan.md) for the full plan and the
decisions behind this stack.

## Stack

- **Vite** + **React 19** + **TypeScript** (single app, no monorepo)
- **MUI v6** (+ Emotion)
- **TanStack Router** (file-based) — typed routes, typed search params, loaders
- **TanStack Query** — server state; **TanStack Table** (headless) — grids
- **React Hook Form + Zod** — forms & validation
- **graphql-request** + **graphql-codegen** — data layer (schema: `../server/schema.graphql`)
- **Zustand** — UI/session state
- **pnpm** as the package manager (the legacy `client/` stays on yarn)

## Commands

```sh
pnpm install        # install deps
pnpm generate       # codegen: GraphQL types from ../server/schema.graphql
pnpm dev            # dev server on http://localhost:3004 (proxies to a local server :8000)
pnpm build          # production build
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint
```

Point the dev proxy at a different server with `VITE_API_TARGET` (see `.env.example`).

## Layout

```
src/
  main.tsx            app entry (providers + router)
  app/                shell: router, session store, theme, layout
  api/                graphql client
  lib/                config, query client
  routes/             file-based routes (routeTree.gen.ts is generated)
  gql/                generated base schema types (generated)
  features/           feature verticals (Stock, Stocktake, …)
```
