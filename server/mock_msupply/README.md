# mock_msupply

A tiny standalone HTTP server that answers the V5 sync endpoints the
open-mSupply central + remote rely on, in place of running the full
legacy mSupply server.

It exists so the file-sync integration tests
(`server/service/src/sync/test/integration/file_sync_pause.rs`) can run
without legacy mSupply. The test process spawns this binary on demand
when `OMS_MOCK_MSUPPLY=1` is set — see that file for the opt-in.

## Endpoints implemented

All under `/sync/v5/`:

- `POST /test/create_site` — generates and remembers a synthetic site
- `GET  /site` — returns site info for the basic-auth user (creating one
  on the fly if unknown, so the central OMS's startup bootstrap is also
  satisfied)
- `GET  /site_status` — always `idle`
- `POST /initialise` — `{ "queueLength": 0 }`
- `GET  /queued_records` — empty batch
- `POST /queued_records` — `{ "integrationStarted": false }`
- `POST /acknowledged_records` — 204 No Content
- `GET  /central_records` — `{ "maxCursor": 0, "data": [] }`
- `POST /test/upsert`, `POST /test/delete` — accept and discard

Response shapes match the deserialisers in `server/service/src/sync/api/`.

## Configuration

CLI flags (preferred on Windows where env vars are awkward) or env vars:

| Flag | Env var | Default | What it does |
| --- | --- | --- | --- |
| `--port` | `MOCK_MSUPPLY_PORT` | `2048` | Listen port on 127.0.0.1; match `APP__SYNC__URL`'s port on the central OMS |
| `--oms-central-url` | `OMS_CENTRAL_URL` | `http://localhost:2055` | Returned as `omSupplyCentralServerUrl` to non-central callers |
| `--oms-central-username` | `OMS_CENTRAL_USERNAME` | `test` | Basic-auth username the central OMS uses for its own self-auth; when this name asks for site info, the response sets `isOmSupplyCentralServer: true` |
| `--msupply-central-site-id` | `OMS_MSUPPLY_CENTRAL_SITE_ID` | `1` | Returned as `mSupplyCentralSiteId` |

`cargo run -p mock_msupply -- --help` for the full description.

## Manual run

```sh
# default port 2048
cargo run -p mock_msupply

# custom port + central URL via flags (works the same on Windows / Unix shells)
cargo run -p mock_msupply -- --port 8081 --oms-central-url http://localhost:2055

curl -X POST http://localhost:2048/sync/v5/test/create_site \
    -H 'Content-Type: application/json' \
    -d '{"visibleNameIds":[]}'
curl http://localhost:2048/sync/v5/site -u 'anyname:anyhash'
```

## Limitations

Sync endpoints other than the file-upload path return "nothing to do"
responses. They satisfy startup and idle polling but don't model real
sync traffic — tests that depend on real sync behaviour against mSupply
are still expected to run against legacy mSupply.
