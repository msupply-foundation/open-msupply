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
  // Spec (Permission denied): authenticated but lacking the permission for the
  // request. Sets the global forbidden signal (the same modal as unexpected
  // errors, but a permission-denied variant with a single OK). Consumers show
  // no error of their own, exactly like unexpectedError — and, since that OK is
  // a dismiss that returns the user to their screen, releasing the busy state
  // matters most here.
  | { kind: 'forbidden' }
  // Anything the flow does not handle itself: connection failures, unusable
  // responses, and — unless returnGraphqlErrors is set — GraphQL errors. Also
  // sets the global unexpected-error signal (modal). The error description
  // lives on the global signal, not on the result: consumers add no error of
  // their own, but MUST release the busy state they entered for the call,
  // values preserved (spec, Unexpected API errors).
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
  // interruption must not degrade the session). Deliberate asymmetry: an
  // unauthenticated result still reports globally (the re-login modal) — only
  // the unexpected-error modal is suppressed.
  background?: boolean;
  endpoint?: string;
};

export const isUnauthenticated = (errors: GraphqlErrorItem[]): boolean =>
  errors.some(e => e.message === 'Unauthenticated');

// Spec (Permission denied): a request the user is authenticated for but lacks
// the permission to make comes back as a plain GraphQL error whose message is
// exactly "Forbidden" (distinct from "Unauthenticated", the no-session case).
export const isForbidden = (errors: GraphqlErrorItem[]): boolean =>
  errors.some(e => e.message === 'Forbidden');

// The server names the missing checks inside `extensions.details`, e.g.
//   "Missing access to store: X, Required permissions:
//    And([HasStoreAccess, HasPermission(StocktakeMutate)]), Store: Some(\"X\")"
// We surface only the HasPermission(...) names — the actual UserPermission the
// user is missing (PascalCase, e.g. StocktakeMutate; NOT the query's
// SCREAMING_CASE) — and drop the structural checks like HasStoreAccess. Names
// are de-duplicated in first-seen order; empty when details is
// absent/unparsable (the modal then shows a generic permission-denied message).
export const missingPermissions = (errors: GraphqlErrorItem[]): string[] => {
  const seen = new Set<string>();
  for (const e of errors) {
    const details = e.extensions?.details;
    if (typeof details !== 'string') continue;
    for (const match of details.matchAll(/HasPermission\(([A-Za-z0-9]+)\)/g)) {
      seen.add(match[1]);
    }
  }
  return [...seen];
};

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

// Spec (Unexpected API Errors, D109): the failure condition the global error
// dialog maps to its fixed title/guidance. Classified at the transport
// (spec/startup/contract.md): a rejected fetch → 'unreachable'; HTTP 408 →
// 'timeout'; HTTP 5xx → 'server'; everything else — any other non-OK status,
// an unusable body, unexpected GraphQL errors, a promoted payload value →
// 'unknown'.
export type UnexpectedErrorCondition =
  'unreachable' | 'timeout' | 'server' | 'unknown';

export type UnexpectedErrorInfo = {
  condition: UnexpectedErrorCondition;
  /** The raw technical string — support-facing, shown only in Show details. */
  cause: string;
  /** The failed operation, e.g. "mutation upsertStocktakeLines". */
  request: string;
  /** Quotable, timestamp-based support reference (spec/startup/contract.md). */
  reference: string;
  /** The failing operation was a mutation — the error interrupted an edit. */
  duringEdit: boolean;
};

// Spec (Unexpected API Errors): one global failure state for any request that
// fails outside the expected, structured union results — connection failures,
// unusable responses, and unexpected GraphQL errors. The global error dialog
// shows the condition-mapped copy on top of everything (D109); the flow that
// made the request stays in its loading phase.
const [unexpectedError, setUnexpectedError] = createSignal<
  UnexpectedErrorInfo | undefined
>(undefined);
export { unexpectedError };
// The dialog's Close path: dismisses in place — the flow behind has released
// its busy state, so the action can simply be repeated (spec, Unexpected API
// errors).
export const clearUnexpectedError = (): void => {
  setUnexpectedError(undefined);
};

// A quotable, timestamp-based support reference, e.g. "3f9a-2026-08-13T02:41Z"
// — matchable in server access logs by time, where the raw cause alone
// ("Failed to fetch") gives support nothing to look up.
const mintReference = (): string => {
  const prefix = Math.random().toString(16).slice(2, 6).padEnd(4, '0');
  return `${prefix}-${new Date().toISOString().slice(0, 16)}Z`;
};

// Spec (Permission denied): a separate global signal for the authorised-but-
// forbidden case. Holds the missing UserPermission names to show; the modal's
// permission-denied variant reads it, and its single OK action clears it (no
// reload/navigation — the app keeps running, since a lacked permission is not a
// broken app state). Undefined = no permission error showing.
const [forbiddenError, setForbiddenError] = createSignal<string[] | undefined>(
  undefined
);
export { forbiddenError };
export const clearForbiddenError = (): void => {
  setForbiddenError(undefined);
};

// Spec (Permission denied): surface the global permission-denied modal from a
// client-side affordance check — a role the user's loaded permissions lack,
// caught before the action is fired (e.g. refusing a create up front instead of
// hiding the button). The same modal a server Forbidden routes to. Names are
// the PascalCase form the modal humanises, matching the wire's
// HasPermission(...) names an actual Forbidden would carry.
export const reportPermissionDenied = (permissions: string[]): void => {
  setForbiddenError(permissions);
};

// Spec (Token refresh): track when the last GraphQL call happened.
let lastCallAt = Date.now();
export const msSinceLastGqlCall = (): number => Date.now() - lastCallAt;

type ResponseBody<TResult> = {
  data?: TResult | null;
  errors?: GraphqlErrorItem[];
};

// Best-effort operation kind + name, parsed off the query string. The name is
// cosmetic metadata appended to the request URL (below) so the operation is
// identifiable in the browser network tab / server access logs without
// opening the POST body — the GraphQL server ignores unknown query params; the
// actual operation is still driven entirely by the body. The kind decides the
// error dialog's edit modifier: a mutation failure interrupted an edit
// (spec/startup/contract.md).
const OPERATION_RE = /(query|mutation)\s+(\w+)/;
const operationName = (query: string): string =>
  OPERATION_RE.exec(query)?.[2] ?? 'anonymous';
const isMutation = (query: string): boolean =>
  OPERATION_RE.exec(query)?.[1] === 'mutation';

// Structural sharing at the transport (kdd/state-management decision 5): when
// a query's response body is byte-identical to the previous response for the
// same operation + variables, graphqlFetch returns the SAME parsed object
// instead of parsing again. State published straight off the response
// (setUser(data.me), a resource fetcher returning nodes) then compares
// reference-equal at its signal, so an unchanged background refresh — the
// post-sync re-reads, the sync-status fallback poll — notifies nobody, which
// is what makes an unchanged refresh imperceptible (spec/sync-modal › after a
// run completes, OMS-REG-SYNC-03.31/.32). Publishers that DERIVE a new object
// from the response instead need their own boundary — an owned memo
// (storeContext), or an explicit compare where the value is rebuilt every
// load (loadDictionary).
//
// One entry per operation document, so memory is bounded by the operation
// count; alternating variables for one operation just miss the cache, costing
// only the parse we always paid. Mutations are never shared — their responses
// answer an action, not a state read. Comparing the text we already hold is
// cheaper than any structural compare, and a hit skips JSON.parse entirely.
// Fetched data must be treated as immutable for the shared reference to be
// sound — kdd/type-safety already requires exactly that.
const lastQueryResponse = new Map<
  string,
  { varsKey: string; text: string; data: unknown }
>();

export async function graphqlFetch<TResult, TVariables>(
  document: TypedDocument<TResult, TVariables>,
  variables: TVariables,
  options: FetchOptions<TResult> = {}
): Promise<GraphqlResult<TResult>> {
  lastCallAt = Date.now();
  const unexpected = (
    condition: UnexpectedErrorCondition,
    cause: string
  ): GraphqlFailure => {
    if (!options.background)
      setUnexpectedError({
        condition,
        cause,
        request: `${isMutation(document.query) ? 'mutation' : 'query'} ${operationName(document.query)}`,
        reference: mintReference(),
        duringEdit: isMutation(document.query),
      });
    return { kind: 'unexpectedError' };
  };
  const requestUrl = `${options.endpoint ?? GRAPHQL_URL}?opName=${encodeURIComponent(operationName(document.query))}`;
  let response: Response;
  try {
    // Auth is cookie-based (HttpOnly session cookie); no token headers.
    response = await fetch(requestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ query: document.query, variables }),
    });
  } catch (e) {
    // The fetch itself rejected — no response reached us at all.
    return unexpected(
      'unreachable',
      e instanceof Error ? e.message : String(e)
    );
  }
  if (!response.ok) {
    if (response.status === 408) {
      return unexpected('timeout', `HTTP ${response.status}`);
    }
    if (response.status >= 500) {
      return unexpected('server', `HTTP ${response.status}`);
    }
    return unexpected('unknown', `HTTP ${response.status}`);
  }
  let text: string;
  try {
    text = await response.text();
  } catch (e) {
    return unexpected('unknown', e instanceof Error ? e.message : String(e));
  }
  const shareable = !isMutation(document.query);
  const varsKey = JSON.stringify(variables) ?? '';
  if (shareable) {
    const held = lastQueryResponse.get(document.query);
    if (held && held.varsKey === varsKey && held.text === text) {
      // Byte-identical response: hand back the held object (same reference —
      // see lastQueryResponse above), skipping the parse. Held entries are
      // always successes, so only the per-call success mapping re-applies.
      const data = held.data as TResult;
      const mapped = options.mapSuccessToError?.(data);
      if (mapped !== undefined) {
        return unexpected('unknown', mapped);
      }
      return { kind: 'success', data };
    }
  }
  let body: ResponseBody<TResult>;
  try {
    body = JSON.parse(text) as ResponseBody<TResult>;
  } catch (e) {
    return unexpected('unknown', e instanceof Error ? e.message : String(e));
  }
  if (body.errors && body.errors.length > 0) {
    if (isUnauthenticated(body.errors)) {
      reportUnauthenticated();
      return { kind: 'unauthenticated' };
    }
    // A caller opting into its own GraphQL-error handling takes Forbidden too
    // (it may treat a permission-scoped read as an empty/partial result); only
    // the default path routes Forbidden to the global permission-denied modal.
    if (!options.returnGraphqlErrors && isForbidden(body.errors)) {
      if (!options.background)
        setForbiddenError(missingPermissions(body.errors));
      return { kind: 'forbidden' };
    }
    const message = describeErrors(body.errors);
    if (options.returnGraphqlErrors) {
      return { kind: 'graphqlError', message, errors: body.errors };
    }
    return unexpected('unknown', message);
  }
  if (body.data == null) {
    return unexpected('unknown', 'Response contained neither data nor errors');
  }
  // A well-formed success: give the caller a last chance to promote a bad
  // payload value to the global unexpected-error modal (e.g. a union NodeError
  // branch).
  const mapped = options.mapSuccessToError?.(body.data);
  if (mapped !== undefined) {
    return unexpected('unknown', mapped);
  }
  if (shareable) {
    lastQueryResponse.set(document.query, { varsKey, text, data: body.data });
  }
  return { kind: 'success', data: body.data };
}
