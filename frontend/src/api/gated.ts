import type { Resource } from 'solid-js';

// The non-suspending resource read — the canonical spelling of the binding
// read-safety gate (kdd/solid-reactivity-pitfalls › No remounts on
// interaction, checklist rule 2). Returns the latest value only once one has
// resolved; 'unresolved' | 'pending' | 'errored' yield undefined WITHOUT
// touching `.latest` (which suspends on the first pending read). Callers own
// their fallback (`gated(data) ?? []`). `resource.loading` stays the spinner
// boolean; a direct `resource()` read stays reserved for a screen's first
// load with no live user state to lose.
export const gated = <T>(resource: Resource<T>): T | undefined =>
  resource.state === 'ready' || resource.state === 'refreshing'
    ? resource.latest
    : undefined;

// A detail read's own "no such record" (#1746). Its fetcher resolves `null`
// when the server answered the id as not found, and `undefined` when the read
// itself failed: graphqlFetch has already opened the global unexpected-error
// modal for that, and its Retry reloads. Only the first is the screen's
// not-found notice; under a failure the screen keeps its spinner, so a slow or
// dropped connection never tells the user a record they can reach is gone.
// Reads `.latest` only once settled, so it never suspends.
export const notFound = (resource: Resource<unknown>): boolean =>
  resource.state === 'ready' && resource.latest === null;
