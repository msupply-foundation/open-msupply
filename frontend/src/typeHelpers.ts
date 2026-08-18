// Parse a number input's string to Float | null (blank → null), leaving other
// fields intact.
export const toNumberOrNull = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};

// Compile-time exhaustiveness for discriminated unions: call in the default arm
// of a switch. If a new variant is added, the narrowed type is no longer
// `never` and the call stops compiling at exactly the switch that needs
// updating.
export const exhaustiveCheck = (value: never): never => {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
};

// Element-by-element (===) comparison of two arrays, treating null as a value
// (both null → equal). Meant as the `equals` for a createMemo whose output is a
// tuple of reactive inputs: createResource dedupes its source by reference and
// has no `equals` option, so a memo with this comparator gives it a source that
// only changes when a field actually changes (kdd/solid-reactivity-pitfalls).
// Same-reference and same-length are the fast paths; different length or any
// element mismatch → not equal.
export const shallowEqual = <T extends readonly unknown[]>(
  a: T | null,
  b: T | null
): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.length === b.length &&
    a.every((v, i) => v === b[i]));

// Are two fetched payloads structurally identical? The explicit dedup for the
// rare publisher that REBUILDS its value on every load, where neither
// graphqlFetch's structural sharing nor a memo boundary can preserve identity
// (kdd/state-management decision 5) — loadDictionary is the one such site
// today. JSON-round-trip data only: parsed responses / string maps, no
// undefined/Date/function values. A false negative just costs a re-render; a
// false positive cannot arise from differing data (any difference changes the
// text).
export const sameFetchedValue = <T>(a: T, b: T): boolean =>
  a === b || JSON.stringify(a) === JSON.stringify(b);

// Drop keys whose value is null/undefined or an empty operator object ({}),
// keeping the same type. A generated GraphQL filter carries these two "not
// applied" markers: FilterBar holds an added-but-empty chip as a `null` key,
// and a hand-edited URL can leave an empty operator object. Stripping both
// means the query variables (and their serialised resource key) reflect only
// live filters, so an empty chip does not perturb the fetch. The `as` is the
// standard cost of iterating an object's own keys (Object.keys is typed
// string[]); it is provably safe — the keys come from `obj` itself — which is
// why this lives in the trusted helper module, not a vertical.
export const stripEmpty = <T extends object>(obj: T): T => {
  const result = { ...obj };
  for (const key of Object.keys(result) as (keyof T)[]) {
    const value = result[key];
    if (value == null) delete result[key];
    else if (typeof value === 'object' && Object.keys(value).length === 0)
      delete result[key];
  }
  return result;
};
