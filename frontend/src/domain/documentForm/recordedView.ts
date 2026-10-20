/*
 * The read-only fallback renderer's layout (kdd/custom-forms/specs.md § Forms
 * in the UI; implementation-plan H12): a document laid out from its pinned
 * schema alone, for a document no form can open. Every value the document
 * holds is shown: in the schema's order under the schema's titles (or its
 * property names made readable) where the schema declares it, and by its
 * path in a list of its own where it does not, so a value an earlier schema
 * dropped but the document kept (Djibouti's maternal history on its
 * encounters) is never hidden. Nothing is left blank: empty values and empty
 * groups are left out.
 *
 * Pure over the schema and the data, so it is tested as data; the component
 * (DocumentAsRecorded.tsx) formats the values.
 */
import { asSchema, flatten, resolveRef, type JsonSchema } from './schemaNode';

export type RecordedEntry =
  | {
      kind: 'value';
      path: string;
      label: string;
      /** A scalar, or a list of scalars. */
      value: unknown;
      /** The schema's `format` for it (`date`, `date-time`), if any. */
      format?: string;
    }
  | {
      kind: 'group';
      path: string;
      label: string;
      entries: RecordedEntry[];
    };

export interface UndeclaredValue {
  path: string;
  value: unknown;
}

export interface RecordedView {
  entries: RecordedEntry[];
  /** Values at paths the pinned schema does not declare, each by its path. */
  undeclared: UndeclaredValue[];
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const isEmpty = (v: unknown): boolean =>
  v === undefined ||
  v === null ||
  v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (isObject(v) && Object.keys(v).length === 0);

/** A node's `anyOf` / `oneOf` members, resolved: a nullable field's types. */
const alternatives = (root: JsonSchema, node: JsonSchema): JsonSchema[] => {
  const resolved = resolveRef(root, node);
  return [resolved['anyOf'], resolved['oneOf']]
    .flatMap(list => (Array.isArray(list) ? list : []))
    .flatMap(member => {
      const m = asSchema(member);
      return m ? [resolveRef(root, m)] : [];
    });
};

/** The properties an object node declares, its alternatives' included. */
const propertiesOf = (
  root: JsonSchema,
  node: JsonSchema
): Record<string, JsonSchema> => {
  const properties = { ...flatten(root, node).properties };
  for (const member of alternatives(root, node)) {
    Object.assign(properties, flatten(root, member).properties);
  }
  return properties;
};

/*
 * The one alternative a node wraps, when it is a wrapper: a nullable field
 * (`anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }]`) is its one
 * non-null member. An enum written as a list of `const` members is not a
 * wrapper, and neither is a choice between several types: none of their
 * members speaks for the field, so a title taken from one would label the
 * field with a single value.
 */
const wrapped = (
  root: JsonSchema,
  node: JsonSchema
): JsonSchema | undefined => {
  const members = alternatives(root, node).filter(
    member =>
      member['type'] !== 'null' && !('const' in member) && !('enum' in member)
  );
  const [only] = members;
  return members.length === 1 ? only : undefined;
};

const keyword = (
  root: JsonSchema,
  node: JsonSchema,
  name: 'title' | 'format'
): string | undefined => {
  const own = resolveRef(root, node)[name];
  if (typeof own === 'string') return own;
  const inner = wrapped(root, node);
  return typeof inner?.[name] === 'string'
    ? (inner[name] as string)
    : undefined;
};

const itemsOf = (root: JsonSchema, node: JsonSchema): JsonSchema | undefined =>
  asSchema(resolveRef(root, node)['items']) ??
  alternatives(root, node)
    .map(member => asSchema(member['items']))
    .find(items => items !== undefined);

/**
 * A property name as a label: `dateOfBirth` → "Date of birth", `code2` →
 * "Code 2", `HIVStatus` → "HIV status". The fallback has no form, so this is
 * what names a field its schema gives no title.
 */
export const humanise = (key: string): string => {
  const words = key
    .replace(/[_\-.]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words
    .map((word, i) => {
      // An acronym keeps its capitals; any other word after the first is
      // lower-cased, as the app's labels are.
      if (word.length > 1 && word === word.toUpperCase()) return word;
      if (i === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      return word.toLowerCase();
    })
    .join(' ');
};

const join = (path: string, key: string): string =>
  path ? `${path}.${key}` : key;

/** Every scalar under `value`, each by its own path. */
const leaves = (path: string, value: unknown): UndeclaredValue[] => {
  if (isEmpty(value)) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => leaves(join(path, String(i)), item));
  }
  if (isObject(value)) {
    return Object.entries(value).flatMap(([k, v]) => leaves(join(path, k), v));
  }
  return [{ path, value }];
};

const entryFor = (
  root: JsonSchema,
  node: JsonSchema | undefined,
  path: string,
  key: string,
  value: unknown,
  undeclared: UndeclaredValue[]
): RecordedEntry | undefined => {
  if (isEmpty(value)) return undefined;
  const label = (node && keyword(root, node, 'title')) ?? humanise(key);
  if (isObject(value)) {
    const entries = entriesOf(root, node, path, value, undeclared);
    return entries.length > 0
      ? { kind: 'group', path, label, entries }
      : undefined;
  }
  if (Array.isArray(value) && value.some(isObject)) {
    const items = node ? itemsOf(root, node) : undefined;
    const entries = value.flatMap((item, i) => {
      const entry = entryFor(
        root,
        items,
        join(path, String(i)),
        key,
        item,
        undeclared
      );
      if (!entry) return [];
      // Each item of a list of records is numbered under the list's label.
      return [{ ...entry, label: `${label} ${i + 1}` }];
    });
    return entries.length > 0
      ? { kind: 'group', path, label, entries }
      : undefined;
  }
  const format = node && keyword(root, node, 'format');
  return format
    ? { kind: 'value', path, label, value, format }
    : { kind: 'value', path, label, value };
};

const entriesOf = (
  root: JsonSchema,
  node: JsonSchema | undefined,
  path: string,
  data: Record<string, unknown>,
  undeclared: UndeclaredValue[]
): RecordedEntry[] => {
  const properties = node ? propertiesOf(root, node) : {};
  // A node declaring no properties at all (a free-form object, or a subtree
  // the schema does not describe) shows its values by their names; only a key
  // missing from a declared shape is undeclared.
  const declaresShape = Object.keys(properties).length > 0;
  const entries: RecordedEntry[] = [];
  const add = (key: string, schema: JsonSchema | undefined) => {
    const entry = entryFor(
      root,
      schema,
      join(path, key),
      key,
      data[key],
      undeclared
    );
    if (entry) entries.push(entry);
  };
  for (const [key, schema] of Object.entries(properties)) {
    if (Object.hasOwn(data, key)) add(key, schema);
  }
  for (const key of Object.keys(data)) {
    if (Object.hasOwn(properties, key)) continue;
    if (declaresShape) undeclared.push(...leaves(join(path, key), data[key]));
    else add(key, undefined);
  }
  return entries;
};

/** The document `data` laid out from the schema it is pinned to. */
export const recordedView = (schema: unknown, data: unknown): RecordedView => {
  const undeclared: UndeclaredValue[] = [];
  const root = asSchema(schema) ?? {};
  const entries = isObject(data)
    ? entriesOf(root, root, '', data, undeclared)
    : [];
  return { entries, undeclared };
};

/**
 * Whether `data` holds a value the schema does not declare: a key the schema
 * names no property for, or anything inside an object it declares no
 * properties for (the base types' `extension`, where a deployment keeps its
 * own fields). The host's default form draws only what the base type declares,
 * so such a value is one no default form shows.
 */
export const holdsBeyondSchema = (schema: unknown, data: unknown): boolean => {
  const root = asSchema(schema) ?? {};
  const beyond = (node: JsonSchema | undefined, value: unknown): boolean => {
    if (isEmpty(value)) return false;
    if (Array.isArray(value)) {
      const items = node ? itemsOf(root, node) : undefined;
      return value.some(item => beyond(items, item));
    }
    if (!isObject(value)) return false;
    const properties = node ? propertiesOf(root, node) : {};
    if (Object.keys(properties).length === 0) return true;
    return Object.entries(value).some(
      ([key, v]) =>
        !isEmpty(v) &&
        (!Object.hasOwn(properties, key) || beyond(properties[key], v))
    );
  };
  return beyond(root, data);
};
