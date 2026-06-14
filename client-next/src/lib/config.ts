// All server endpoints are same-origin: the Vite dev proxy forwards to the server in
// development, and in production the server serves the web app on the same origin.
export const Environment = {
  GRAPHQL_URL: '/graphql',
  FILE_URL: '/files?id=',
  SYNC_FILES_URL: '/sync_files',
  // Repo-root package.json version, inlined by Vite (see vite.config.ts).
  APP_VERSION: __APP_VERSION__,
} as const;
