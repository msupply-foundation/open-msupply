/*
 * Local `$ref`s in a document schema, read the way JSON Schema defines them.
 * A `$ref` is a URI reference, so the JSON Pointer in its fragment is
 * percent-encoded (RFC 6901 § 6): ts-json-schema-generator writes a
 * reference to the definition `Measure<number>` as
 * `#/definitions/Measure%3Cnumber%3E`, and AJV decodes it. Each segment is
 * percent-decoded, then `~1` and `~0` are unescaped, before it is looked up.
 *
 * Shared by the form library's schema reads (schemaNode.ts) and the build's
 * schema comparison (schemaDiff.ts), so neither can disagree with the
 * validator about what a reference points at.
 */

const isContainer = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

/**
 * What a local `$ref` points at within `root`; undefined for a reference
 * outside the document or one that names nothing.
 */
export const refTarget = (root: unknown, ref: string): unknown => {
  if (!ref.startsWith('#')) return undefined;
  const pointer = ref.slice(1);
  if (pointer === '') return root;
  if (!pointer.startsWith('/')) return undefined;
  let target = root;
  for (const encoded of pointer.slice(1).split('/')) {
    let key: string;
    try {
      key = decodeURIComponent(encoded);
    } catch {
      return undefined;
    }
    key = key.replaceAll('~1', '/').replaceAll('~0', '~');
    if (!isContainer(target) || !Object.hasOwn(target, key)) return undefined;
    target = target[key];
  }
  return target;
};

// Keywords whose values are data, not schemas, so a `$ref` key inside one is
// not a reference.
const DATA_KEYWORDS = new Set(['const', 'default', 'enum', 'examples']);

/**
 * Every `$ref` in a schema that does not resolve to a schema object within
 * it, each listed once. A form field or a comparison that meets one sees
 * nothing at that path, while the validator refuses the document, so the
 * build reports them.
 */
export const unresolvedRefs = (schema: unknown): string[] => {
  const unresolved = new Set<string>();
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isContainer(node)) return;
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') {
        const target = refTarget(schema, value);
        if (!isContainer(target) || Array.isArray(target)) {
          unresolved.add(value);
        }
      } else if (!DATA_KEYWORDS.has(key)) {
        visit(value);
      }
    }
  };
  visit(schema);
  return [...unresolved];
};
