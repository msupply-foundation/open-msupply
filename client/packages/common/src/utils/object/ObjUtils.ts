type ParsedObject = Record<string, string | number | boolean | null>;

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(k =>
    deepEqual(
      (a as Record<string, unknown>)[k],
      (b as Record<string, unknown>)[k]
    )
  );
};

export const ObjUtils = {
  // Performs a deep comparison between two values to determine if they are equivalent.
  isEqual: deepEqual,

  // Checks is input is an actual object (i.e. key-vals)
  isObject: (input: unknown): input is Record<string, unknown> =>
    typeof input === 'object' && input !== null && !Array.isArray(input),
  // Turns an object into a Record<string, string | number | boolean | null>
  parse: (input: string | null | undefined): ParsedObject => {
    if (!input) return {};

    const maybeObject = JSON.parse(input) as ParsedObject;
    return !!maybeObject && ObjUtils.isObject(maybeObject) ? maybeObject : {};
  },
};
