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

/*
 * Are two FETCHED payloads structurally identical? The `equals` for a signal a
 * BACKGROUND refresh rewrites — the post-sync re-reads of me / storeContext
 * (api/syncStore § onRunCompleted) — where the new response is almost always
 * identical to the one already held.
 *
 * Solid compares signal values by reference, so writing a fresh object from an
 * unchanged response notifies every reader. That is not merely wasted work: a
 * memo derived from it recomputes and yields a fresh value, and a table's column
 * set is such a memo — so TanStack rebuilds its cells and the card view's <For>
 * tears down and rebuilds every field, taking focus and any half-typed entry
 * with it. On a server that syncs every couple of seconds that fires
 * continuously, which is what made a line editor's fields impossible to type in.
 *
 * JSON, not a field-by-field compare: these are plain GraphQL responses — no
 * cycles, no class instances, no functions — and their key order is fixed by the
 * query's own selection set, so the serialisation is stable for equal data. The
 * asymmetry is safe in both directions: a false NEGATIVE (calling equal data
 * unequal) only costs the re-render we already had, and a false POSITIVE cannot
 * arise from data that differs, because any difference changes the text.
 */
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
