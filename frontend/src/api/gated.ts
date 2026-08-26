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
