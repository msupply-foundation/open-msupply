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

| Command                 | What it does                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `pnpm dev`              | Dev server with hot reload + CSS-module type watcher                                 |
| `pnpm build`            | Production build (CSS types → `tsc -b` → `vite build`)                               |
| `pnpm preview`          | Serve the production build locally                                                   |
| `pnpm check`            | Full static check: CSS types, TypeScript, stylelint, theme-token and page-CSS checks |
| `pnpm lint`             | ESLint (`lint:fix` to auto-fix)                                                      |
| `pnpm format`           | Prettier write (`format:check` to verify only)                                       |
| `pnpm test`             | Vitest                                                                               |
| `pnpm codegen`          | Regenerate GraphQL types from the pinned schema (no backend needed — see below)      |
| `pnpm translate-locale` | Draft-translate the English catalogs into another locale (see below)                 |
| `pnpm dev-android`      | One-command Android dev loop (see below)                                             |
| `pnpm build-android`    | Build the Android APK                                                                |

Before committing, `pnpm check`, `pnpm lint`, `pnpm format:check`, and
`pnpm test` should all pass.

## GraphQL codegen

Types are generated from the **pinned** schema at [`spec/schema.graphql`](spec/schema.graphql),
not from a running server — so `pnpm codegen` needs no backend, and the same
tree generates the same types on every machine and in CI. It writes a
co-located `<name>.generated.ts` next to every `.graphql` file under `src/` and
the plugin trees. Re-run it whenever you add or edit a `.graphql` file. The
generated files are committed, and CI fails if they don't match what codegen
produces — so commit the regenerated output alongside the query that changed.

Neither the pin nor the generated files are ever hand-edited. The pin is the
committed output of the server's own exporter, refreshed from the `server/`
in this repo:

```sh
cd ../server
cargo run --bin remote_server_cli -- export-graphql-schema \
  --path ../frontend/spec/schema.graphql
```

That needs no database and no running server — the schema is built from the
Rust types. Refresh it when the backend's schema changes, then re-run
`pnpm codegen` and commit both.

To try a query against a backend whose schema hasn't reached the pin yet, set
`SCHEMA_URL` to introspect a running server instead
(`SCHEMA_URL=http://localhost:8000/graphql pnpm codegen`). That is a local
check only — what it generates must not be committed, because the committed
types belong to the pin.

## Draft translations

New locale keys go into `src/intl/locales/en/` only — translating them is a
separate pass, owned by the translation team. To bootstrap a **new** language,
or to temporarily paper over gaps in an existing one, machine-translate the
English catalogs:

```sh
pnpm translate-locale fr-CA          # insert: only fills keys the target lacks
pnpm translate-locale fr-CA update   # update: re-translates every key
```

It walks every `*.json` under `locales/en/`, masks `{{tokens}}` so they survive
the round trip, and writes `locales/<code>/`. It asks for confirmation first
and needs a TTY. Output is a **draft**: it can't pick plural categories (the
English `_one`/`_other` forms are copied as-is) and must never overwrite
reviewed translations — that's what `insert` mode protects.

A brand-new catalog also has to be registered in `src/intl/locales.ts`
(`SUPPORTED_LOCALES` + `LOCALE_META`), or the app won't offer it and
`locales.test.ts` fails; the script reminds you when it's missing.

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
