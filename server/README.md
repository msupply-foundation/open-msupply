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

An optional second ("old UI") frontend can be served under the `/old-ui/` URL
prefix by setting `server.old_ui_frontend_dir`. When unset (the default),
nothing is mounted at `/old-ui/` and root serving is unaffected. The old UI
must be built with its `publicPath`/router base set to `/old-ui/` (see the
client's `PUBLIC_PATH` build variable).
