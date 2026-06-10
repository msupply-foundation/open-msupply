# server-go — Go port feasibility spike

This is a **time-boxed de-risking spike**, not a production rewrite. Goal: produce real
compile-time + load-test numbers and retire the biggest technical risks of porting the
Open mSupply Rust backend (`../server`) to Go, **before** committing to a full port.

Full plan: `~/.claude/plans/i-d-like-to-explore-calm-cray.md`.

## Hard requirements the spike must prove achievable
- **100% DB backward compatibility** — SQLite *and* Postgres, including upgrading an old
  DB (e.g. a 2.11.0 SQLite file) to latest on the Go server.
- **100% GraphQL/API compatibility** — the existing React client talks to the Go server unchanged.

## Layout
```
schema/schema.graphql   exported SDL from ../server (parity source of truth)   [WS0]
cmd/server/             Go server entrypoint                                    [WS1]
cmd/migrate/            migration runner CLI                                    [WS3]
cmd/parity/             Go-vs-Rust GraphQL response-diff harness                [WS1 verify]
internal/graphql/       gqlgen generated code + resolvers                       [WS1]
internal/repository/    repo layer: linked-tables, dynamic filter/sort, views   [WS2]
internal/migrations/    version-based runner + ported migrations                [WS3]
internal/db/            dual-DB abstraction, dialect branching, driver select    [WS4]
internal/auth/          validate_auth equivalent middleware                     [WS1]
ffi/boa/                Rust staticlib + cgo wrapper for report convert_data     [WS5]
bench/compile/          compile-time measurement scripts                        [WS6]
bench/load/             k6 scripts + shared query set                           [WS6]
docs/                   DECISION.md (WS7), parity-matrix.md (WS4)
```

## Recommended Go stack (validated during the spike)
| Concern | Choice |
|---|---|
| HTTP / routing | `net/http` + `chi` |
| GraphQL | gqlgen (schema-first, fed the exported SDL) |
| DataLoaders | `vikstrous/dataloadgen` |
| DB | `database/sql` + sqlc (CRUD) + squirrel/goqu (dynamic) |
| SQLite | **benchmark both**: `modernc.org/sqlite` (pure-Go) vs `mattn/go-sqlite3` (CGO) |
| Postgres | `jackc/pgx` |
| Migrations | custom runner mirroring `../server/repository/src/migrations`, reusing the SQL strings |
| Frontend embed | stdlib `embed` |
| Config | `yaml.v3` + env (mirror `../server/configuration/base.yaml`) |

## Out of scope (estimated, not built)
Full sync engine; all ~200 queries / 150 mutations; Android/Windows/desktop packaging;
full plugin runtime; email/SMTP; Excel/PDF beyond the WS5 probe.
