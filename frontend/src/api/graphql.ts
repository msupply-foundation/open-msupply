/**
 * Minimal type-safe GraphQL client over the browser `fetch` — trusted layer
 * (`as` permitted; see kdd/type-safety).
 *
 * Pairs with the codegen output (codegen/plugin.js): each generated operation
 * exposes a `query` string plus phantom Result / Variables types.
 * `graphqlFetch` ties them together so the call site is fully typed with no
 * runtime dependency.
 *
 * `graphqlFetch` never throws: it returns a discriminated `GraphqlResult` that
 * call sites match on `kind`, Rust-style.
 */
import { createSignal } from 'solid-js';
// Deliberate import cycle (authContext also imports graphqlFetch): both sides
// only use the other inside function bodies, never during module
// initialisation.
import { reportUnauthenticated } from '../auth/authContext';
import { GRAPHQL_URL } from '../config';

/**
 * A query bundled with its types. Codegen emits one of these per operation:
 * the query string plus phantom Result / Variables types (type-only, never
 * assigned at runtime). `graphqlFetch` infers both from the passed document, so
 * a query can only be called with its own variables and yields its own result.
 */
export interface TypedDocument<TResult, TVariables> {
  query: string;
  /** Phantom — carries the result type only; not present at runtime. */
  __result?: TResult;
  /** Phantom — carries the variables type only; not present at runtime. */
  __variables?: TVariables;
}

export type GraphqlErrorItem = {
  message: string;
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
};

export type GraphqlFailure =
  // Spec (Unexpected logout): also sets the global unauthenticated signal.
  | { kind: 'unauthenticated' }
  // Anything the flow does not handle itself: connection failures, unusable
  // responses, and — unless returnGraphqlErrors is set — GraphQL errors. Also
  // sets the global unexpected-error signal (modal); consumers treat this as a
  // continuation of their loading phase. The error description lives on the
  // global signal, not on the result.
  | { kind: 'unexpectedError' }
  // GraphQL errors from the response, returned only when the caller opts in via
  // returnGraphqlErrors to handle them itself.
  | { kind: 'graphqlError'; message: string; errors: GraphqlErrorItem[] };

export type GraphqlResult<TResult> =
  { kind: 'success'; data: TResult } | GraphqlFailure;

type FetchOptions<TResult> = {
  // Return the response's GraphQL errors as a graphqlError result for the
  // caller to handle, instead of the default global unexpected-error treatment.
  returnGraphqlErrors?: boolean;
  // Inspect an otherwise-successful payload and optionally promote it to the
  // global unexpected-error modal. The transport succeeded and the response is
  // well-formed, but a value INSIDE it represents a failure the caller would
  // rather treat as unexpected (e.g. a union `NodeError` branch that "should
  // never happen" for a valid request). Return a description to trip the modal
  // and turn the result into { kind: 'unexpectedError' }; return undefined to
  // let the success through unchanged. Same effect as an infra failure — the
  // caller simply sees a non-success and stays in its loading phase (spec:
  // Unexpected API Errors).
  mapSuccessToError?: (data: TResult) => string | undefined;
  // A self-retrying background call (an interval poll with a live-channel
  // alternative, e.g. the sync-status fallback poll): failures still return
  // { kind: 'unexpectedError' } but do NOT trip the global unexpected-error
  // modal — a transient outage would otherwise convert a silently-recoverable
  // background retry into a forced app reload (spec/sync-modal: a transport
  // interruption must not degrade the session).
  background?: boolean;
  endpoint?: string;
};

export const isUnauthenticated = (errors: GraphqlErrorItem[]): boolean =>
  errors.some(e => e.message === 'Unauthenticated');

// Server errors carry the human-useful specifics in `extensions.details` (e.g.
// `NotAuthenticated("Missing auth token")`) while `message` is often just the
// generic category ("Unauthenticated"). Surface the details when present and
// distinct, so the unexpected-error modal shows what actually went wrong rather
// than the bare category.
const describeError = (e: GraphqlErrorItem): string => {
  const details = e.extensions?.details;
  if (
    typeof details === 'string' &&
    details.length > 0 &&
    details !== e.message
  ) {
    return `${e.message}: ${details}`;
  }
  return e.message;
};

// Join every error into one description for the modal / graphqlError summary.
export const describeErrors = (errors: GraphqlErrorItem[]): string =>
  errors.map(describeError).join(', ');

// Spec (Unexpected API Errors): one global failure state for any request that
// fails outside the expected, structured union results — connection failures,
// unusable responses, and unexpected GraphQL errors. A modal shows the
// description on top of everything; its only action reloads the whole app, so
// nothing clears it during normal use. The flow that made the request stays in
// its loading phase.
const [unexpectedError, setUnexpectedError] = createSignal<string | undefined>(
  undefined
);
export { unexpectedError };
// For tests only — the app recovers via full reload.
export const clearUnexpectedError = (): void => {
  setUnexpectedError(undefined);
};

// Spec (Token refresh): track when the last GraphQL call happened.
let lastCallAt = Date.now();
export const msSinceLastGqlCall = (): number => Date.now() - lastCallAt;

type ResponseBody<TResult> = {
  data?: TResult | null;
  errors?: GraphqlErrorItem[];
};

export async function graphqlFetch<TResult, TVariables>(
  document: TypedDocument<TResult, TVariables>,
  variables: TVariables,
  options: FetchOptions<TResult> = {}
): Promise<GraphqlResult<TResult>> {
  lastCallAt = Date.now();
  const unexpected = (message: string): GraphqlFailure => {
    if (!options.background) setUnexpectedError(message);
    return { kind: 'unexpectedError' };
  };
  let response: Response;
  try {
    // Auth is cookie-based (HttpOnly session cookie); no token headers.
    response = await fetch(options.endpoint ?? GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ query: document.query, variables }),
    });
  } catch (e) {
    return unexpected(e instanceof Error ? e.message : String(e));
  }
  if (!response.ok) {
    return unexpected(`HTTP ${response.status}`);
  }
  let body: ResponseBody<TResult>;
  try {
    body = (await response.json()) as ResponseBody<TResult>;
  } catch (e) {
    return unexpected(e instanceof Error ? e.message : String(e));
  }
  if (body.errors && body.errors.length > 0) {
    if (isUnauthenticated(body.errors)) {
      reportUnauthenticated();
      return { kind: 'unauthenticated' };
    }
    const message = describeErrors(body.errors);
    if (options.returnGraphqlErrors) {
      return { kind: 'graphqlError', message, errors: body.errors };
    }
    return unexpected(message);
  }
  if (body.data == null) {
    return unexpected('Response contained neither data nor errors');
  }
  // A well-formed success: give the caller a last chance to promote a bad
  // payload value to the global unexpected-error modal (e.g. a union NodeError
  // branch).
  const mapped = options.mapSuccessToError?.(body.data);
  if (mapped !== undefined) {
    return unexpected(mapped);
  }
  return { kind: 'success', data: body.data };
}
