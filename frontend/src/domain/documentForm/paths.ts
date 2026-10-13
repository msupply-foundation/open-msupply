/*
 * Field paths into a document (kdd/custom-forms/specs.md § Authoring): a form
 * names each field by a dot-joined path through its document type, and the
 * compiler checks the path against the type. The same paths name AJV's errors
 * (converted from JSON pointers) and, in a migration, the values it moves or
 * leaves unresolved, so one vocabulary joins the form, validation and
 * versioning.
 *
 * A path enters an array of objects at its first item only, written `.0.` as
 * AJV's pointers name it (`contactDetails.0.phone`): a deployment's patient
 * form keeps its address in the first contact block, the one the server
 * projects onto the patient record. Any other item, and an array of plain
 * values, is a leaf, except a list of notes, which a path names whole for the
 * notes list (`NotesPath`), and a list of enum values, which it names whole for
 * the multi-select (`EnumArrayPath`).
 *
 * TO-DO: keyed array items and the generic array controls (implementation-plan
 * H23).
 */
import type { Note } from '../../plugin-sdk/documents';

// Recursion budget for the path types: deep enough for every base document
// (Patient reaches `contacts.0.contactDetails.0.phone`, plugin extensions add
// two or three levels under `extension.<programKey>`), and a bound so a
// recursive type cannot run the compiler away.
type Depth = [never, 0, 1, 2, 3, 4, 5, 6, 7];

type Leafless<V> = V extends readonly unknown[]
  ? never
  : V extends object
    ? V
    : never;

/** The item type of an array of objects; never for anything else. */
type ObjectItem<V> = V extends readonly (infer E)[]
  ? Leafless<NonNullable<E>>
  : never;

/**
 * Every dot path into `T`, objects included, entering an array of objects at
 * its first item (`.0`) and stopping at any other array.
 */
export type Path<T, D extends number = 7> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T & string]-?:
          | K
          | (Leafless<NonNullable<T[K]>> extends never
              ? never
              : `${K}.${Path<Leafless<NonNullable<T[K]>>, Depth[D]>}`)
          | (ObjectItem<NonNullable<T[K]>> extends never
              ? never
              : | `${K}.0`
                | `${K}.0.${Path<ObjectItem<NonNullable<T[K]>>, Depth[D]>}`);
      }[keyof T & string]
    : never;

/** The value one step down from `T`: a property, or an array's first item. */
type Child<T, K extends string> =
  NonNullable<T> extends readonly (infer E)[]
    ? K extends '0'
      ? E
      : never
    : K extends keyof NonNullable<T>
      ? NonNullable<T>[K]
      : never;

/** The value type at `P` in `T`, without the optionality of its ancestors. */
export type PathValue<T, P extends string> = P extends `${infer K}.${infer R}`
  ? PathValue<NonNullable<Child<T, K>>, R>
  : Child<T, P>;

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
          : Test extends 'notes'
            ? NonNullable<PathValue<T, P>> extends readonly Note[]
              ? P
              : never
            : Test extends 'enumArray'
              ? NonNullable<PathValue<T, P>> extends readonly (infer E)[]
                ? E extends string
                  ? string extends E
                    ? never
                    : P
                  : never
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
/** Paths whose value is a list of notes (`Note[]`). */
export type NotesPath<T> = PathsWhere<T, 'notes'>;
/**
 * Paths whose value is a list of values from an enum (an array whose items
 * are a union of string literals).
 */
export type EnumArrayPath<T> = PathsWhere<T, 'enumArray'>;

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

const isIndex = (key: string) => /^\d+$/.test(key);

const isEmptyContainer = (c: object) =>
  Array.isArray(c) ? c.length === 0 : Object.keys(c).length === 0;

/*
 * Writes `value` at `path` in `target`, mutating it: missing parents are
 * created, as an array where the next key is an index and an object
 * otherwise. Writing `undefined` removes the value (an array item is spliced
 * out) and then every ancestor left empty by the removal, so clearing a field
 * the user filled in leaves the document as it was rather than carrying
 * `{ vitals: {} }` or `contactDetails: [{}]`, and an optional value is absent
 * rather than an empty string the schema might refuse (an enum or a date-time
 * format). An emptied array item is dropped only from the end of its array,
 * so the items after it keep their places: clearing the first contact
 * block's last field leaves an empty first block, not the second one moved up.
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
  for (const [i, key] of keys.entries()) {
    const next = current[key];
    const wantsArray = isIndex(keys[i + 1] ?? last);
    if (wantsArray ? !Array.isArray(next) : !isPlainObject(next)) {
      if (value === undefined) return;
      current[key] = wantsArray ? [] : {};
    }
    current = current[key] as Record<string, unknown>;
    chain.push(current);
  }
  if (value !== undefined) {
    current[last] = value;
    return;
  }
  if (!Array.isArray(current)) delete current[last];
  else if (isIndex(last)) current.splice(Number(last), 1);
  for (let i = keys.length - 1; i >= 0; i--) {
    const parent = chain[i] as Record<string, unknown> | unknown[];
    if (!isEmptyContainer(chain[i + 1] as object)) break;
    if (!Array.isArray(parent)) delete parent[keys[i] as string];
    else if (Number(keys[i]) === parent.length - 1) parent.pop();
    else break;
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
