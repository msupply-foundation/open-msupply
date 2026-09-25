// A t() for node tests that shows WHAT a message names: the key, then its
// interpolated values — so a test can assert that an error names the right
// field and value, which the node fallback (the bare key) cannot show.
export const tWithValues = (key: string, values?: Record<string, unknown>) =>
  values ? `${key}(${Object.values(values).join('|')})` : key;
