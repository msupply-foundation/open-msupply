# Server

- **Docs site**: [https://dev-docs.msupply.foundation/](https://dev-docs.msupply.foundation/docs/introduction/)
- **Source**: [docs/content/server/\_index.md](../docs/content/server/_index.md)

## Serving front-end

The server serves the web frontend at runtime from `server.frontend_dir`
(default `frontend`, resolved relative to the working directory). Packaging
ships the built bundle there; on Android the app shell copies its bundled web
assets there on startup. In debug builds, when the configured directory
doesn't exist, the server serves the in-repo builds directly — `frontend/dist`
at `/` and `client/packages/host/dist` at `/old-ui/` — so `cargo run` serves
both UIs without any configuration or copying.

A second ("old UI") frontend is served under the `/old-ui/` URL prefix from
the `old-ui` subdirectory of `frontend_dir`, when present — by convention, not
configuration, so every deployment gets the same URL. When the subdirectory
doesn't exist nothing is mounted at `/old-ui/` and root serving is unaffected.
The old UI must be built with its `publicPath`/router base set to `/old-ui/`
(see the client's `PUBLIC_PATH` build variable) — it fixes the asset URLs and the
router base at build time, so a bundle built for `/` cannot be relocated by
copying it.

For local development, `yarn build:old-ui` in `client/` does that build; the
result lands in `client/packages/host/dist`, which a debug server picks up
directly (see below). It does NOT copy anything into `server/frontend` — and
staging a copy there by hand is counterproductive, since the configured
directory then takes priority over the fallback and shadows BOTH UIs.
Packaging does its own copy step, since each pipeline has its own destination.

### Getting both UIs in place locally

From the repo root:

```sh
cd frontend && corepack pnpm install && pnpm build   # new FE -> frontend/dist
cd client && yarn build:old-ui                       # old UI -> client/packages/host/dist
```

A debug server (`cargo run` from `server/`) serves both directly from those
build outputs — nothing to copy. Note: a leftover `server/frontend` directory
from the pre-monorepo staged-copy workflow takes priority over the direct
fallback — delete it.

### In-tree frontend build (new FE at `/`)

The new frontend lives in this repo under `frontend/`. Each packaging
pipeline builds it from the working tree (`corepack pnpm install && pnpm
build` in `frontend/` — the pnpm version is pinned by its `packageManager`)
and copies `frontend/dist` into its own staging area as the `frontend/`
directory served at `/` — the shipped FE is always the FE of the commit being
built. The old UI is built with `PUBLIC_PATH=/old-ui/` and nested at
`frontend/old-ui`, which the server serves at `/old-ui/` by convention, so a
packaged bundle serves both UIs out of the box.

(Pre-monorepo, the new FE was a pinned, checksum-verified release asset of
the separate private open-msupply-frontend repo, fetched by
`build/fetch-frontend.js` with a pin file `frontend-version.json` and a
GitHub App token. That machinery is gone.)
