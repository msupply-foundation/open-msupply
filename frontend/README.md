# open-msupply-frontend

A [SolidJS](https://www.solidjs.com/) frontend for [open mSupply](https://msupply.foundation/open-msupply/),
built with Vite and typed end-to-end via GraphQL codegen. It talks to the
open-mSupply Rust backend over GraphQL, and ships to Android as a Capacitor app.

## Prerequisites

- **Node.js 24** — pinned in [`.nvmrc`](.nvmrc), so `nvm use` (or `fnm use`)
  picks the right version. Anything matching Vite's `^20.19.0 || >=22.12.0`
  builds, but 24 is what the project is developed and tested on.
- **pnpm 10** — the exact version is pinned in `package.json`
  (`packageManager`), so the easiest path is `corepack enable` and letting
  Corepack pick it up
- **A running open-mSupply backend** on `http://localhost:8000` — the dev
  server proxies all GraphQL requests to it, so the app won't get past login
  without one

## Getting started

```sh
pnpm install
pnpm dev
```

The app is served at <http://localhost:3005>. `pnpm dev` runs Vite plus a
watcher that regenerates type definitions for CSS modules (`*.module.css.d.ts`).

The dev server proxies `/graphql` and `/custom-translations` to the backend.
Two environment variables override the defaults (see `vite.config.ts`):

| Variable               | Default                 | Purpose              |
| ---------------------- | ----------------------- | -------------------- |
| `DEV_SERVER_PORT`      | `3005`                  | Vite dev server port |
| `GRAPHQL_PROXY_TARGET` | `http://localhost:8000` | Backend to proxy to  |

## Scripts

| Command              | What it does                                                                         |
| -------------------- | ------------------------------------------------------------------------------------ |
| `pnpm dev`           | Dev server with hot reload + CSS-module type watcher                                 |
| `pnpm build`         | Production build (CSS types → `tsc -b` → `vite build`)                               |
| `pnpm preview`       | Serve the production build locally                                                   |
| `pnpm check`         | Full static check: CSS types, TypeScript, stylelint, theme-token and page-CSS checks |
| `pnpm lint`          | ESLint (`lint:fix` to auto-fix)                                                      |
| `pnpm format`        | Prettier write (`format:check` to verify only)                                       |
| `pnpm test`          | Vitest                                                                               |
| `pnpm codegen`       | Regenerate GraphQL types (needs the backend running — see below)                     |
| `pnpm dev-android`   | One-command Android dev loop (see below)                                             |
| `pnpm build-android` | Build the Android APK                                                                |

Before committing, `pnpm check`, `pnpm lint`, `pnpm format:check`, and
`pnpm test` should all pass.

## GraphQL codegen

Types are generated from the **live** backend schema, not a checked-in one.
`pnpm codegen` introspects `http://localhost:8000/graphql` (override with
`SCHEMA_URL`) and writes a co-located `<name>.generated.ts` next to every
`src/**/*.graphql` file. Re-run it whenever you add or edit a `.graphql` file,
or after the backend schema changes. The generated files are committed.

## Android

The Android app is a Capacitor wrapper around the same frontend. You'll need
the Android SDK (`adb` on PATH) and a JDK for Gradle.

```sh
pnpm dev-android    # dev loop: vite + debug APK + USB tunnels + hot reload
```

`scripts/dev-android.sh` documents the details (device selection, port
tunnelling); background and design live in `kdd/android/`.

## Where the docs live

- [`spec/`](spec/README.md) — what the app must do (source of truth)
- [`kdd/`](kdd/README.md) — key design decisions: why the code is shaped the
  way it is
- [`src/ui/CLAUDE.md`](src/ui/CLAUDE.md) — the component library, styling
  rules, and the dev-only showcase
- [`CLAUDE.md`](CLAUDE.md) — working guidelines and project priorities
