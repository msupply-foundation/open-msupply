# Network Surface Behaviors

Scope: CORS policy, the auxiliary discovery server, the GraphQL playground, and query-cost limits — the "how do strangers on the network talk to us" layer.

## Invariants

### INV-NET-1 — `is_develop()` is compile-time; every security-relevant gate keys off it deliberately

`is_develop()` = `cfg!(debug_assertions)` (`server/service/src/settings.rs:161-164`). Everything gated on it is a build-profile property:

- permissive CORS (`server/server/src/cors.rs:6-8`)
- cert-free HTTP allowed (`server/server/src/certs.rs:93`)
- plugin validation bypass (`server/service/src/plugin/plugin_files.rs:106-110`, see static-serving.md)
- auto-create local config (`server/server/src/configuration.rs:111`)
- CLI restore skip-confirmation (`server/cli/src/backup/restore.rs:47`)

**Rule:** any new dev-mode convenience that relaxes a security control must gate on `is_develop()` and be listed in this spec. A release-profile binary must never contain a path that serves with relaxed controls.

### INV-NET-2 — Production CORS is origin-allowlist + `Sec-Fetch-Site` heuristic, with a legacy loophole

Production branch of `cors_policy` (`server/server/src/cors.rs:9-42`): fixed allowlist from config, then `allowed_origin_fn` permits `Sec-Fetch-Site: same-origin | same-site | none | <absent>`.

The `<absent> → allow` arm is a **2023 workaround** for a Chrome bug that omitted the header for bare-IP targets:

- 2022-11-14 `53a39142c3` introduced the origin fn (Android/Electron UA-sniffed, in-code TODO: "does this open up an attack vector?") — absent header then meant **deny**.
- 2023-05-04 `d8306731ea` ("Fix cors for ip connection") flipped absent → **allow** for the Chrome-by-IP case.

Current browsers send `Sec-Fetch-Site` on all cross-origin fetches including IP targets, and CORS binds only browsers (non-browser clients set any headers they like). The workaround is therefore **probably obsolete**, and tightening `<absent> → deny` is a pending hardening blocked only on confirming no still-supported client relies on it (audit Q5). Do not remove the arm without a release note, because the failure mode is silent breakage of whichever legacy client depended on the 2023 fix.

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
