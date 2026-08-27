/**
 * The per-type invoice update mutations report failures two ways: thrown
 * GraphQL errors (BadUserInput etc.) AND resolved *structured* error payloads
 * (e.g. `{ __typename: 'UpdateInboundShipmentError', error: {...} }`, possibly
 * nested inside a batch response). Several update hooks resolve those without
 * checking, so a save can "succeed" while the server rejected it.
 *
 * Recursively scans a resolved mutation result for any `__typename` ending in
 * "Error" and throws, so the Properties tab's try/catch reports failure
 * correctly regardless of which view's update fn shape it received.
 *
 * Deliberately generic rather than per-view response checks: the five update
 * hooks have five different response shapes (plain, batch-wrapped, union),
 * which change when the hooks do — while the `*Error` typename suffix is the
 * schema-wide convention for every structured error union. The payloads are
 * single-invoice sized, so the walk is cheap. Revisit if the update hooks ever
 * converge on throwing for structured errors themselves.
 */
export const throwIfStructuredError = (result: unknown): void => {
  const found = findErrorTypename(result);
  if (found) {
    throw new Error(`Save rejected: ${found}`);
  }
};

const findErrorTypename = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findErrorTypename(item);
      if (found) return found;
    }
    return undefined;
  }
  if (value && typeof value === 'object') {
    const typename = (value as { __typename?: unknown }).__typename;
    if (typeof typename === 'string' && typename.endsWith('Error')) {
      return typename;
    }
    for (const child of Object.values(value)) {
      const found = findErrorTypename(child);
      if (found) return found;
    }
  }
  return undefined;
};
