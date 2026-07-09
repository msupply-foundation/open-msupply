// Compile-time exhaustiveness for discriminated unions: call in the default arm
// of a switch. If a new variant is added, the narrowed type is no longer `never`
// and the call stops compiling at exactly the switch that needs updating.
export const exhaustiveCheck = (value: never): never => {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
};

// Drop keys whose value is null/undefined or an empty operator object ({}), keeping
// the same type. A generated GraphQL filter carries these two "not applied" markers:
// FilterBar holds an added-but-empty chip as a `null` key, and a hand-edited URL can
// leave an empty operator object. Stripping both means the query variables (and their
// serialised resource key) reflect only live filters, so an empty chip does not
// perturb the fetch. The `as` is the standard cost of iterating an object's own keys
// (Object.keys is typed string[]); it is provably safe — the keys come from `obj`
// itself — which is why this lives in the trusted helper module, not a vertical.
export const stripEmpty = <T extends object>(obj: T): T => {
  const result = { ...obj };
  for (const key of Object.keys(result) as (keyof T)[]) {
    const value = result[key];
    if (value == null) delete result[key];
    else if (typeof value === 'object' && Object.keys(value).length === 0) delete result[key];
  }
  return result;
};
