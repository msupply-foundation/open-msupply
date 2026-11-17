# Network Surface Behaviors

Scope: CORS policy, the auxiliary discovery server, the GraphQL playground, and query-cost limits — the "how do strangers on the network talk to us" layer.

## Invariants

### INV-NET-1 — `is_develop()` is compile-time; every security-relevant gate keys off it deliberately

`is_develop()` = `cfg!(debug_assertions)` (`server/service/src/settings.rs:161-164`). Everything gated on it is a build-profile property:

- permissive CORS (`cors_policy_for` in `server/server/src/cors.rs`)
- WebSocket origin check skipped (`websocket_origin_check_for` in `server/server/src/cors.rs`, see INV-NET-6)
- cert-free HTTP allowed (`server/server/src/certs.rs:93`)
- plugin validation bypass (`server/service/src/plugin/plugin_files.rs:106-110`, see static-serving.md)
- auto-create local config (`server/server/src/configuration.rs:111`)
- CLI restore skip-confirmation (`server/cli/src/backup/restore.rs:47`)

**Rule:** any new dev-mode convenience that relaxes a security control must gate on `is_develop()` and be listed in this spec. A release-profile binary must never contain a path that serves with relaxed controls.

### INV-NET-2 — Production CORS is origin-allowlist + `Sec-Fetch-Site` heuristic, with a legacy loophole

Production branch of `cors_policy` (`server/server/src/cors.rs`): `allowed_origin_fn` calls `is_origin_allowed`, which permits an origin listed in `server.cors_origins`, or any origin when `Sec-Fetch-Site` is `same-origin | none | <absent>`.

`same-site` is **not** allowed (#1644): it would let a page on another subdomain of the same site (another `*.msupply.org` server, say) or on another port of the same host make credentialed requests and read the replies. The shipped clients don't need it: the web UI at `/` and `/old-ui/` and the desktop and Android shells all load the UI from the server they talk to (same-origin), and non-browser clients send no `Sec-Fetch-Site`. A sibling origin that really does need access goes in `cors_origins`. Each entry must be an origin exactly as a browser sends it (`scheme://host[:port]`, with the host in lower case, no `:80` on `http` or `:443` on `https`, and no trailing slash), since it's compared byte for byte; the server logs a warning at startup for an entry that isn't. One known case: the new Android shell's draft local mode (`frontend/kdd/android/android-spec.md`) has the page stay on the Capacitor origin `https://localhost` and call the embedded server at `https://localhost:8000`. That's `same-site`, so if it ships that way, the embedded server's `cors_origins` (`server/android/src/android.rs`) needs `https://localhost`.

The `<absent> → allow` arm is a **2023 workaround** for a Chrome bug that omitted the header for bare-IP targets:

- 2022-11-14 `53a39142c3` introduced the origin fn (Android/Electron UA-sniffed, in-code TODO: "does this open up an attack vector?") — absent header then meant **deny**.
- 2023-05-04 `d8306731ea` ("Fix cors for ip connection") flipped absent → **allow** for the Chrome-by-IP case.

Current browsers send `Sec-Fetch-Site` on all cross-origin fetches including IP targets, and CORS binds only browsers (non-browser clients set any headers they like). The workaround is therefore **probably obsolete**, and tightening `<absent> → deny` is a pending hardening blocked only on confirming no still-supported client relies on it (audit Q5). Do not remove the arm without a release note, because the failure mode is silent breakage of whichever legacy client depended on the 2023 fix.

### INV-NET-6 — WebSocket upgrades are held to the same origin rule as HTTP

Browsers don't apply CORS to WebSocket upgrades, and actix-cors doesn't refuse a request from a disallowed origin: it only leaves out `Access-Control-Allow-Origin`, which a WebSocket never checks (`cors_alone_does_not_refuse_a_websocket_upgrade` pins this). The session cookie is `SameSite=Strict` (`set_session_cookie` in `server/graphql/general/src/queries/login.rs`), so a browser sends it on an upgrade only from a page on the same site as the server. That still includes a page on another subdomain (another `*.msupply.org` server, say) or another port of the same host. With CORS alone, such a page could open `/graphql/ws` as the signed-in user and run subscriptions.

`websocket_origin_check_for` (`server/server/src/cors.rs`, part of `wrap_main_server` in `server/server/src/middleware/mod.rs`) answers `403` to any request carrying `Upgrade: websocket` whose `Origin` fails `is_origin_allowed`, the same function the HTTP policy uses, so the two can't drift apart. That refuses the same-site page above. It also refuses a cross-site page, which only matters for a browser that sends the cookie cross-site in spite of `SameSite=Strict`; any other browser sends that page's upgrade no cookie, so it isn't signed in anyway. Develop builds skip the check, matching `Cors::permissive()` (INV-NET-1).

- **No `Origin` → allow.** Browsers always send `Origin` on a WebSocket upgrade, so a missing one means a non-browser client. That client holds no user's browser cookies and could send any `Origin` it liked, so refusing it protects nothing. HTTP behaves the same: actix-cors only checks requests that carry an `Origin`. (The desktop and Android shells are browsers here: their pages come from the server, so they send `Origin` and pass as `same-origin`.)
- **`Origin` present, `Sec-Fetch-Site` absent → allow.** INV-NET-2's legacy arm applies here too, so a browser too old to send fetch metadata is let through from any origin. That includes any browser old enough to ignore `SameSite`: the major browsers all shipped `SameSite` years before `Sec-Fetch-Site`. Same residual as HTTP; if that arm is ever removed, it goes for both.

### INV-NET-3 — The discovery server (port+1) is currently over-permissive; pinned intended behavior

Today: `HttpServer` on `port+1` unconditionally wraps `Cors::permissive()` (`server/server/src/lib.rs:304-313`). The discovery schema serves only `DiscoveryQueries` (server presence, site name, init status, version) and has no auth of its own, so `allow-credentials` is moot — but the permissive CORS lets any web origin read site name/status cross-origin. **Confirmed finding F-3; intended behavior is `.wrap(cors_policy(&settings))`.** The site name leak itself (VULN-12) is pinned as **intended**: identifying the site to browsers on the LAN is the discovery server's purpose, and the name also travels by DNS-SD broadcast.

### INV-NET-4 — GraphiQL playground must be develop-only

Today `GET /graphql` serves `playground.html` in all builds (`server/graphql/lib.rs:489-492,561-565`) — confirmed finding F-3 companion; intended: serve 404 unless `is_develop()`. Rationale: the playground gives unauthenticated interactive schema exploration plus a ready-made credential-guessing form on any reachable deployment. Schema secrecy is not a goal (the code is public — introspection stays on), but frictionless attack tooling shipped in the binary is.

### INV-NET-5 — GraphQL query cost must be bounded

Today there are no `limit_depth`/`limit_complexity` calls on any schema builder (`server/graphql/lib.rs:398-444`) — confirmed finding F-2. Intended: the operational schema (and init schema for consistency) carries explicit depth and complexity ceilings calibrated above the deepest legitimate client query. Without these, an authenticated low-priv user (or any pre-login query path) can amplify CPU/DB work per request on low-powered hardware.

## How to verify

```text
# CORS production behavior:
curl -s -o /dev/null -w '%{http_code}' -X OPTIONS http://<server>/graphql \
  -H 'Origin: http://evil.example' -H 'Access-Control-Request-Method: POST'   # expect 403-ish / no ACAO echo

# Same-site origin not in cors_origins — expect 400 / no ACAO echo:
curl -s -o /dev/null -w '%{http_code}' -X OPTIONS http://<server>/graphql \
  -H 'Origin: https://other.msupply.org' -H 'Access-Control-Request-Method: POST' \
  -H 'Sec-Fetch-Site: same-site'

# WebSocket upgrade from a disallowed origin (INV-NET-6) — expect 403 on release, 101 on a dev build:
curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://<server>/graphql/ws \
  -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H 'Sec-WebSocket-Protocol: graphql-transport-ws' \
  -H 'Origin: https://evil.example' -H 'Sec-Fetch-Site: cross-site'

# Discovery server must not echo arbitrary origins (once F-3 fixed):
curl -sv http://<server>:<port+1>/graphql -X OPTIONS -H 'Origin: http://evil.example' \
  -H 'Access-Control-Request-Method: POST' | grep -i access-control-allow-origin   # expect absent

# Playground gating (once fixed):
curl -s -o /dev/null -w '%{http_code}' http://<server>/graphql   # 404 on release, 200 on dev build

# Depth limit (once fixed) — expect a validation error, not execution:
curl -s http://<server>/graphql -X POST -H 'Content-Type: application/json' \
  --data-binary @<(python3 - <<'EOF'
import json
q='query{'
for _ in range(60): q+='invoice(id:\"x\"){ lines { nodes { item { '
q+='__typename' + '}'*3*60 + '}'
print(json.dumps({'query':q}))
EOF)         # expect: "Query is nested too deep"
```
