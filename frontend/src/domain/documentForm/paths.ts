/*
 * Field paths into a document (kdd/custom-forms/specs.md § Authoring): a form
 * names each field by a dot-joined path through its document type, and the
 * compiler checks the path against the type. The same paths name AJV's errors
 * (converted from JSON pointers) and, in a migration, the values it moves or
 * leaves unresolved, so one vocabulary joins the form, validation and
 * versioning.
 *
 * Arrays are leaves here: a path stops at an array property and never indexes
 * into one. The minimal form library has no array control; the notes list and
 * the generic array controls are later work (implementation-plan H23).
 */

// Recursion budget for the path types: deep enough for every base document
// (Patient reaches `birthPlace.address1`, plugin extensions add two or three
// levels under `extension.<programKey>`), and a bound so a recursive type
// cannot run the compiler away.
type Depth = [never, 0, 1, 2, 3, 4, 5, 6, 7];

type Leafless<V> = V extends readonly unknown[]
  ? never
  : V extends object
    ? V
    : never;

/** Every dot path into `T`, objects included, stopping at arrays. */
export type Path<T, D extends number = 7> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T & string]-?:
          | K
          | (Leafless<NonNullable<T[K]>> extends never
              ? never
              : `${K}.${Path<Leafless<NonNullable<T[K]>>, Depth[D]>}`);
      }[keyof T & string]
    : never;

/** The value type at `P` in `T`, without the optionality of its ancestors. */
export type PathValue<T, P extends string> = P extends `${infer K}.${infer R}`
  ? K extends keyof NonNullable<T>
    ? PathValue<NonNullable<NonNullable<T>[K]>, R>
    : never
  : P extends keyof NonNullable<T>
    ? NonNullable<T>[P]
    : never;

type PathsWhere<T, Test> = {
  [P in Path<T>]: Test extends 'text'
    ? string extends NonNullable<PathValue<T, P>>
      ? P
      : never
    : Test extends 'enum'
      ? NonNullable<PathValue<T, P>> extends string
        ? string extends NonNullable<PathValue<T, P>>
          ? never
          : P
        : never
      : Test extends 'number'
        ? NonNullable<PathValue<T, P>> extends number
          ? P
          : never
        : Test extends 'boolean'
          ? NonNullable<PathValue<T, P>> extends boolean
            ? P
            : never
          : never;
}[Path<T>];

/** Paths whose value is free text (`string`, not a union of literals). */
export type TextPath<T> = PathsWhere<T, 'text'>;
/** Paths whose value is a union of string literals: an enum in the schema. */
export type EnumPath<T> = PathsWhere<T, 'enum'>;
/** Paths whose value is a number. */
export type NumberPath<T> = PathsWhere<T, 'number'>;
/** Paths whose value is a boolean. */
export type BooleanPath<T> = PathsWhere<T, 'boolean'>;

// Keys that reach an object's prototype rather than its own data. Paths come
// from plugin code (form paths are compiler-checked, migration paths are
// checked against the schema), but a document's own keys never need these,
// and writing through one would change every object in the page.
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** A path's keys, or undefined for a path through a prototype key. */
const segments = (path: string): string[] | undefined => {
  const keys = path.split('.');
  return keys.some(key => UNSAFE_KEYS.has(key)) ? undefined : keys;
};

/** The value at `path` in `data`, or undefined where any step is missing. */
export const getAt = (data: unknown, path: string): unknown => {
  const keys = segments(path);
  if (!keys) return undefined;
  let current: unknown = data;
  for (const key of keys) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/*
 * Writes `value` at `path` in `target`, mutating it: missing parents are
 * created as objects. Writing `undefined` deletes the property and then every
 * ancestor left empty by the delete, so clearing a field the user filled in
 * leaves the document as it was rather than carrying `{ vitals: {} }`, and an
 * optional value is absent rather than an empty string the schema might
 * refuse (an enum or a date-time format).
 *
 * Called inside a Solid `produce`, so the mutation is the store's.
 */
export const setAt = (
  target: Record<string, unknown>,
  path: string,
  value: unknown
): void => {
  const keys = segments(path);
  if (!keys) return;
  const last = keys.pop() as string;
  const chain: Record<string, unknown>[] = [target];
  let current = target;
  for (const key of keys) {
    const next = current[key];
    if (!isPlainObject(next)) {
      if (value === undefined) return;
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
    chain.push(current);
  }
  if (value !== undefined) {
    current[last] = value;
    return;
  }
  delete current[last];
  for (let i = keys.length - 1; i >= 0; i--) {
    const parent = chain[i];
    const child = chain[i + 1];
    if (Object.keys(child).length > 0) break;
    delete parent[keys[i]];
  }
};

/** A JSON pointer (`/extension/demo/notes`, as AJV reports) as a dot path. */
export const pointerToPath = (pointer: string): string =>
  pointer
    .split('/')
    .slice(1)
    .map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'))
    .join('.');

/*
 * The document with undefined values, empty strings and empty objects
 * removed, recursively; arrays keep their length. Two documents that differ
 * only by what an untouched field leaves behind compare equal after it, which
 * is what "dirty" has to mean for a form over optional fields.
 */
export const normalise = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalise);
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    const n = normalise(v);
    if (n === undefined || n === '') continue;
    if (isPlainObject(n) && Object.keys(n).length === 0) continue;
    out[key] = n;
  }
  return out;
};

export const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a)) {
    return (
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => deepEqual(v, b[i]))
    );
  }
  if (typeof a !== 'object' || Array.isArray(b)) return false;
  const ak = Object.keys(a as object);
  const bk = Object.keys(b as object);
  return (
    ak.length === bk.length &&
    ak.every(k =>
      deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k]
      )
    )
  );
};
