/*
 * What the schema says about one field path: whether it is required, its
 * `format` and its `enum` values. The form library reads this rather than
 * taking it as props, so the required asterisk, how a date is stored and
 * which values a select offers come from the one data contract the server
 * validates against (kdd/custom-forms/specs.md § Data, storage and
 * validation), and a form cannot disagree with it.
 *
 * Emitted schemas are `ts-json-schema-generator` output: a root `allOf` of a
 * `$ref` into `definitions`, properties that are `$ref`s, and inline objects
 * for the `extension` tree. Only local `#/definitions/…` references occur, so
 * that is all this resolves (schemaRef.ts).
 */

import { refTarget } from './schemaRef';

export type JsonSchema = Record<string, unknown>;

export interface FieldSchemaInfo {
  /** Required within its parent object. */
  required: boolean;
  format?: string;
  enum?: readonly string[];
}

const asSchema = (v: unknown): JsonSchema | undefined =>
  v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as JsonSchema)
    : undefined;

const resolveRef = (root: JsonSchema, node: JsonSchema): JsonSchema => {
  let current = node;
  // A chain of references (a definition that is itself a $ref) ends in a few
  // steps; the bound stops a cycle from hanging the form.
  for (let i = 0; i < 16; i++) {
    const ref = current['$ref'];
    if (typeof ref !== 'string') return current;
    const resolved = asSchema(refTarget(root, ref));
    if (!resolved) return current;
    const { $ref: _, ...rest } = current;
    current = { ...resolved, ...rest };
  }
  return current;
};

/*
 * A node's own properties and required list merged with its `allOf` members',
 * so a type emitted as `allOf: [{ $ref }]` reads as one object.
 */
const flatten = (
  root: JsonSchema,
  node: JsonSchema
): { properties: Record<string, JsonSchema>; required: Set<string> } => {
  const resolved = resolveRef(root, node);
  const properties: Record<string, JsonSchema> = {};
  const required = new Set<string>();
  const own = asSchema(resolved['properties']);
  if (own) {
    for (const [k, v] of Object.entries(own)) {
      const s = asSchema(v);
      if (s) properties[k] = s;
    }
  }
  const req = resolved['required'];
  if (Array.isArray(req)) {
    for (const r of req) if (typeof r === 'string') required.add(r);
  }
  const allOf = resolved['allOf'];
  if (Array.isArray(allOf)) {
    for (const member of allOf) {
      const m = asSchema(member);
      if (!m) continue;
      const sub = flatten(root, m);
      Object.assign(properties, sub.properties);
      for (const r of sub.required) required.add(r);
    }
  }
  return { properties, required };
};

/** The schema facts for `path`; undefined when the schema has no such field. */
export const fieldSchemaInfo = (
  root: JsonSchema,
  path: string
): FieldSchemaInfo | undefined => {
  const keys = path.split('.');
  let node: JsonSchema = root;
  let required = false;
  for (const key of keys) {
    // An array's item (`contactDetails.0`): its facts are the `items`
    // schema's, and an item is never required within its array.
    if (/^\d+$/.test(key)) {
      const items = asSchema(resolveRef(root, node)['items']);
      if (!items) return undefined;
      required = false;
      node = items;
      continue;
    }
    const { properties, required: req } = flatten(root, node);
    const next = properties[key];
    if (!next) return undefined;
    required = req.has(key);
    node = next;
  }
  const leaf = resolveRef(root, node);
  const format =
    typeof leaf['format'] === 'string' ? leaf['format'] : undefined;
  const values = leaf['enum'];
  return {
    required,
    format,
    enum: Array.isArray(values)
      ? values.filter((v): v is string => typeof v === 'string')
      : undefined,
  };
};
