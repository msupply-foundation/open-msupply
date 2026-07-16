export const GRAPHQL_URL = '/graphql';
export const GRAPHQL_WS_PATH = '/graphql/ws';

// Custom (server-supplied) translations. The server returns a flat key→value
// map for the requested language, overriding the bundled catalog. Proxied to
// the backend in dev (see the dev server proxy in vite.config.ts).
export const CUSTOM_TRANSLATIONS_URL = '/custom-translations';

export const DEFAULT_SYNC_INTERVAL_SECONDS = 300;
// The current app's status-poll cadence (spec/sync-modal contract: ~2 s
// while the surface is open and the live channel is down).
export const SYNC_POLL_INTERVAL_MS = 2000;
export const ACTIVITY_CHECK_INTERVAL_MS = 1000;
