export const GRAPHQL_URL = '/graphql';
export const GRAPHQL_WS_PATH = '/graphql/ws';

// Generated report files (spec/reports "The generated file"): fetched as
// GET /files?id=<fileId> on the API origin — not a GraphQL operation. Proxied
// to the backend in dev (see the dev server proxy in vite.config.ts).
export const FILES_URL = '/files';

// Sync-file store: per-record document attachments (an inbound shipment's
// documents, etc.) live behind a REST endpoint, not GraphQL —
//   POST   /sync_files/<tableName>/<recordId>          (multipart, field "files")
//   GET    /sync_files/<tableName>/<recordId>/<fileId> (download)
//   DELETE /sync_files/<tableName>/<recordId>/<fileId>
// Proxied to the backend in dev (see vite.config.ts). Mirrors the reference
// app's Environment.SYNC_FILES_URL.
export const SYNC_FILES_URL = '/sync_files';

// Custom (server-supplied) translations. The server returns a flat key→value
// map for the requested language, overriding the bundled catalog. Proxied to
// the backend in dev (see the dev server proxy in vite.config.ts).
export const CUSTOM_TRANSLATIONS_URL = '/custom-translations';

// Support tools (spec/settings/contract.md § Support) — REST, not GraphQL.
// GET /support/database vacuums the server database in place, then streams
// the file (session-cookie auth, SERVER_ADMIN checked in the handler).
// Proxied to the backend in dev (see vite.config.ts).
export const SUPPORT_DATABASE_URL = '/support/database';

// Label-printer connection test (spec/settings/contract.md § Devices — label
// printer): POST with no body, expects { is_valid: boolean } (500 + text on
// failure). The server probes the STORED printer settings, not anything the
// client sends — route confirmed in server source
// (server/server/src/print/mod.rs → test_printer).
export const PRINT_LABEL_TEST_URL = '/print/label-test';

export const DEFAULT_SYNC_INTERVAL_SECONDS = 300;
// The current app's status-poll cadence (spec/sync-modal contract: ~2 s
// while the surface is open and the live channel is down).
export const SYNC_POLL_INTERVAL_MS = 2000;
// The chrome sync indicator's slow cadence (spec/chrome § sync indicator):
// the minutely staleness re-evaluation, doubling as its fallback-poll interval
// while the live channel is down. The modal owns the fast poll while open.
export const SYNC_INDICATOR_REFRESH_MS = 60_000;
export const ACTIVITY_CHECK_INTERVAL_MS = 1000;
