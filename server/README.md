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
yarn fetch-frontend          # new FE (the pin) -> server/frontend
cd client && yarn build:old-ui   # old UI -> server/frontend/old-ui
```

`fetch-frontend` defaults to the public B2 mirror, so it needs no GitHub token
even though the FE repo is private; the pin's `sha256` is enforced either way.
Note it **replaces** `server/frontend` wholesale, and that directory is
gitignored — so it is shared across every branch in your checkout, not per
branch.

### Pinned frontend dist (new FE at `/`)

The new frontend lives in a separate repo,
[open-msupply-frontend](https://github.com/msupply-foundation/open-msupply-frontend)
(private), which publishes a checksum-verified dist zip per git tag as a GitHub
release asset pair: `frontend-dist-<tag>.zip` (bundle at the zip's top level —
`index.html` at the root, `VERSION.txt` inside) and `frontend-dist-<tag>.zip.sha256`.

This repo records which artifact it ships in the **pin file** `frontend-version.json`
at the repo root (`tag` + `sha256`). Packaging fetches and verifies it with
`build/fetch-frontend.js` (plain Node, no npm deps), which unpacks the zip into the
`frontend/` directory served at `/`. The old UI is built at `/old-ui/` and copied to
`frontend/old-ui`, which the server serves at `/old-ui/` by convention, so a
packaged bundle serves both UIs out of the box.

- **Bumping the pin:** set `tag` in `frontend-version.json` to the FE release tag and
  `sha256` to the value from that release's published `frontend-dist-<tag>.zip.sha256`.
- **Private-repo token:** the fetch needs `FRONTEND_FETCH_TOKEN` (or `GITHUB_TOKEN`) with
  read access to the FE repo's release assets — it is sent as an `Authorization: token …`
  header to github.com and dropped when GitHub redirects to its signed asset CDN. GitHub
  Actions workflows (Docker image, transition APK, mac builds) mint a short-lived,
  read-only token per run from the tmf-ci-bot GitHub App
  (`vars.TMF_CI_BOT_APP_ID` / `secrets.TMF_CI_BOT_PRIVATE_KEY`) — nothing to configure
  beyond the app. The Jenkins/Windows box cannot mint app tokens: set
  `FRONTEND_DIST_BASE_URL=https://f002.backblazeb2.com/file/msupply-releases` once —
  the FE release workflow mirrors every dist there (public bucket, layout
  `<tag>/frontend-dist-<tag>.zip`), the script derives the URL from the pin's tag, and
  no credentials are needed; the pin's `sha256` is still enforced. (A fine-grained PAT
  on a bot account remains the fallback if the mirror is unavailable.) On Windows no `unzip.exe` is
  required — `fetch-frontend.js` falls back to `tar -xf` (bsdtar, present on Windows 10+).
- **`FRONTEND_DIST_URL` override:** point the fetch at any http(s) URL, a `file://` URL,
  or a local filesystem path instead of the pinned GitHub asset — used for local testing
  and for later B2 hosting. When it is set, `FRONTEND_DIST_SHA256=skip` may disable
  checksum verification (otherwise the pin's `sha256` is always enforced, and any other
  `FRONTEND_DIST_SHA256` value overrides the expected hash).

The pin currently holds a **placeholder** tag/sha because the FE repo has not cut its
first release; until it does, packaging must be driven with `FRONTEND_DIST_URL`. The
fetch script refuses to fall back to an in-tree build for `/` — the wrong FE at the root
is worse than a loud failure.
