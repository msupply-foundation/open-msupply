# Static Content Serving Behaviors

Scope: what the server serves without authentication, and why that is safe — SPAs and frontend plugin bundles.

## Invariants

### INV-SERVE-1 — The SPA (both UIs) is served unauthenticated

`config_serve_frontend` (`server/server/src/serve_frontend.rs:179-186`) registers catch-all `file`/`index` and the scoped `old_ui_*` routes with no auth middleware. This is required: the login page must render for unauthenticated users. Only static assets and `index.html` shells are served from the configured `frontend_dir`; every data fetch then negotiates its own auth via GraphQL.

**Rule for future work:** nothing under the SPA catch-alls may read from the database or per-user state. Dynamic content does not belong behind these routes.

### INV-SERVE-2 — Frontend plugin bundles are publicly fetchable by id+filename

`GET /frontend_plugins/{plugin_id}/{filename}` (`server/server/src/serve_frontend_plugins.rs:39-55`) has no auth, by design:

- Bytes are served from an in-memory `frontend_plugins_cache` — bundles that were installed and validated at load time (`server/service/src/plugin/mod.rs:356-375`), looked up by HashMap key. There is **no filesystem path resolution** at request time, so no path traversal is possible regardless of the `.*\..+$` route regex.
- Served bytes are exactly what the server hands any logged-in browser via `frontendPluginMetadata` — the endpoint merely skips the login step (parity with INV-SERVE-1).
- Cache headers `public, max-age=31536000, immutable` with content-hash URLs (`?v=<hash>`).

**Rules for future work:**

1. Plugin bundles are client-side code. They must never embed server-side-only secrets, credentials, or data not already obtainable by any logged-in user. If you add a plugin feature that needs such data, serve it through an authenticated GraphQL operation — never bake it into the bundle.
2. Do not convert `get_frontend_plugin_file` to a filesystem lookup for a "convenience" case (e.g. ad-hoc files on disk). If disk serving is ever needed, it must be a new endpoint with path containment handling, reviewed against this spec.

### INV-SERVE-3 — Dev-mode plugin validation bypass exists and is compile-time gated

In debug builds, a plugin file that fails manifest validation is **served anyway** with only a log warning (`server/service/src/plugin/plugin_files.rs:106-110`: `if !is_develop() || !file_path.exists() { return Ok(None) } … Continue serving in dev mode`). `is_develop()` is `cfg!(debug_assertions)` (`server/service/src/settings.rs:161-164`) — a cargo profile property, not a runtime flag; release binaries cannot enable it.

**Consequence:** any debug-build binary that reaches a field device sideloads a null plugin sandbox. Whether debug APKs can reach the field is a release-process control, not a code control (tracked as open question Q4 in the audit).

## How to verify

```text
# SPA + plugins unauthenticated (by design), and no traversal:
curl -i http://<server>/                                    # 200, login shell
curl -i http://<server>/frontend_plugins/<id>/index.js      # 200 bundle / 500 "Plugin id can't be found"
curl -i 'http://<server>/frontend_plugins/<id>/..%2F..%2Fetc'  # expect CannotFindFile, never file bytes

# debug_assertions gate:
rg 'is_develop' server/service/src/settings.rs
cargo build --release -p server 2>/dev/null; ./target/release/server --help >/dev/null && echo "release build has debug_assertions off"
```
