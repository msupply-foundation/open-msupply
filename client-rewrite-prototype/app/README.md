# rewrite-app

Vite + React 19 + TypeScript skeleton for the open-mSupply front-end rewrite.
Context lives one level up: `../DECISIONS.md` (#1 React, #2 Vite), `../STATUS.md`,
`../SPEC.md`.

This is the genuinely-new app that grows feature-by-feature, with the current
client as the behavioural reference (see DECISIONS.md).

## Develop

```sh
corepack yarn install
corepack yarn dev        # http://localhost:3003
```

(If corepack is enabled globally, drop the `corepack` prefix and just use `yarn`.)

## Commands

| command | what it does |
| --- | --- |
| `yarn dev` | Vite dev server with HMR on :3003 |
| `yarn build` | `tsc --noEmit` typecheck, then production bundle to `dist/` |
| `yarn preview` | serve the built `dist/` locally |
| `yarn typecheck` | `tsc --noEmit` only |
| `yarn lint` | ESLint |

## Conventions

- **`@/` → `src/`** import alias (configured in `tsconfig.json` + `vite.config.ts`).
- **yarn 4** (corepack) with the `node-modules` linker and a 7-day supply-chain
  age gate — mirrors `client/.yarnrc.yml`.
- Styling is intentionally minimal/neutral until the styling decision is made.

## Plugins (not built yet)

The runtime plugin system is deferred (DECISIONS.md #2), but the build is kept
Module-Federation-compatible so it can be layered on later without rework.
