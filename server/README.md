# Server

- **Docs site**: [https://dev-docs.msupply.foundation/](https://dev-docs.msupply.foundation/docs/introduction/)
- **Source**: [docs/content/server/\_index.md](../docs/content/server/_index.md)

## Serving front-end

The server serves the web frontend at runtime from `server.frontend_dir`
(default `frontend`, resolved relative to the working directory). Packaging
ships the built bundle there; on Android the app shell copies its bundled web
assets there on startup. In debug builds this falls back to
`client/packages/host/dist` when the configured directory doesn't exist, so
`cargo run` serves the frontend without any configuration.

A second ("old UI") frontend is served under the `/old-ui/` URL prefix from
the `old-ui` subdirectory of `frontend_dir`, when present — by convention, not
configuration, so every deployment gets the same URL. When the subdirectory
doesn't exist nothing is mounted at `/old-ui/` and root serving is unaffected.
The old UI must be built with its `publicPath`/router base set to `/old-ui/`
(see the client's `PUBLIC_PATH` build variable) — it fixes the asset URLs and the
router base at build time, so a bundle built for `/` cannot be relocated by
copying it.

For local development, `yarn build:old-ui` in `client/` does that build and puts
the result in `server/frontend/old-ui`, where a server run from `server/` serves
it. Packaging does the same two steps itself, since each pipeline copies to its
own destination.

### Getting both UIs in place locally

From the repo root:

```sh
yarn stage-frontend          # builds frontend/ -> server/frontend
cd client && yarn build:old-ui   # old UI -> server/frontend/old-ui
```

`stage-frontend` builds the in-tree frontend (`frontend/`, via `corepack pnpm`
— the pnpm version is pinned by `frontend/package.json`). Note it **replaces**
`server/frontend` wholesale, and that directory is gitignored — so it is
shared across every branch in your checkout, not per branch.

### In-tree frontend build (new FE at `/`)

The new frontend lives in this repo under `frontend/`. Packaging builds it
from the working tree with `build/stage-frontend.js` (plain Node, no npm
deps; `corepack pnpm install && pnpm build`), which replaces the target
`frontend/` directory served at `/` with the built dist — the shipped FE is
always the FE of the commit being built. The old UI is built at `/old-ui/`
and copied to `frontend/old-ui`, which the server serves at `/old-ui/` by
convention, so a packaged bundle serves both UIs out of the box.

(Pre-monorepo, the new FE was a pinned, checksum-verified release asset of
the separate private open-msupply-frontend repo, fetched by
`build/fetch-frontend.js` with a pin file `frontend-version.json` and a
GitHub App token. That machinery is gone.)
