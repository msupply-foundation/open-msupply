/**
 * Typed GraphQL error classes. Kept in their own module (no AuthContext
 * import) so AuthContext can reference them without creating a cycle
 * with GqlContext.
 */

/**
 * Transport-level failure: no HTTP response was received (offline, DNS,
 * CORS, server unreachable). React Query retries these; the global
 * connection banner watches for them.
 */
export class NetworkError extends Error {
  constructor(public cause?: unknown) {
    super('Network request failed');
    this.name = 'NetworkError';
  }
}

/** Token missing/expired/rejected. Drives the re-login modal. */
export class UnauthenticatedError extends Error {
  constructor(public detail?: string) {
    super('Unauthenticated');
    this.name = 'UnauthenticatedError';
  }
}

/**
 * Authenticated but not allowed. `path` is the GraphQL field path,
 * used by the global handler to decide whether to surface a toast.
 */
export class PermissionDeniedError extends Error {
  constructor(
    public detail?: string,
    public path?: string[]
  ) {
    super('Forbidden');
    this.name = 'PermissionDeniedError';
  }
}

/** 4xx-equivalent: client sent something the server rejected. */
export class BadUserInputError extends Error {
  constructor(public detail?: string) {
    super('Bad user input');
    this.name = 'BadUserInputError';
  }
}

/** 5xx-equivalent: backend bug or unexpected state. Reported to Bugsnag. */
export class InternalServerError extends Error {
  constructor(public detail?: string) {
    super(detail ?? 'Internal error');
    this.name = 'InternalServerError';
  }
}
