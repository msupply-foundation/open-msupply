/*
 * The comparison behind the versioning build check
 * (kdd/custom-forms/specs.md § Opening an older document): flatten two
 * schema versions into field paths, find every difference that could lose
 * data, and fail on any the migration's coverage map does not account for.
 * Run by the plugin build (vite/formVersionChecks.ts) for every form plugin,
 * so a migration that forgets a difference cannot be packed or installed.
 *
 * Three kinds of difference: a path the old version has and the new one
 * does not (removed), an enum value the new version no longer allows
 * (retired), and a path whose type changed. A new field or value is not a
 * difference, since no old document holds it. Arrays are compared as one
 * field: paths stop at them, as form paths do.
 */
import {
  movedPath,
  retiredValues,
  stepTarget,
  type JsonScalar,
  type MigrationStep,
} from './migration';
import { refTarget } from './schemaRef';

type SchemaNode = Record<string, unknown>;

export interface FlatField {
  /** JSON Schema types allowed at the path, sorted. */
  types: string[];
  /** The allowed values, where the path is an enum. */
  enum?: JsonScalar[];
  /** The string format, where the path declares one (`date`, `date-time`). */
  format?: string;
}

const isNode = (v: unknown): v is SchemaNode =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const resolveRef = (root: SchemaNode, node: SchemaNode): SchemaNode => {
  let current = node;
  const seen = new Set<string>();
  while (typeof current.$ref === 'string') {
    const ref = current.$ref;
    if (seen.has(ref)) break;
    seen.add(ref);
    const target = refTarget(root, ref);
    if (!isNode(target)) break;
    const { $ref: _ref, ...rest } = current;
    current = { ...target, ...rest };
  }
  return current;
};

/** A node with its `$ref`s followed and its `allOf`/`anyOf`/`oneOf` merged. */
const merged = (root: SchemaNode, node: SchemaNode): SchemaNode[] => {
  const self = resolveRef(root, node);
  const parts = [self];
  for (const key of ['allOf', 'anyOf', 'oneOf']) {
    const branches = self[key];
    if (!Array.isArray(branches)) continue;
    for (const branch of branches) {
      if (isNode(branch)) parts.push(...merged(root, branch));
    }
  }
  return parts;
};

const typesOf = (parts: SchemaNode[]): string[] => {
  const types = new Set<string>();
  for (const part of parts) {
    const type = part.type;
    if (typeof type === 'string') types.add(type);
    if (Array.isArray(type)) {
      for (const t of type) if (typeof t === 'string') types.add(t);
    }
    if (type === undefined && isNode(part.properties)) types.add('object');
  }
  return [...types].sort();
};

const enumOf = (parts: SchemaNode[]): JsonScalar[] | undefined => {
  let values: JsonScalar[] | undefined;
  for (const part of parts) {
    const list = Array.isArray(part.enum)
      ? (part.enum as JsonScalar[])
      : 'const' in part
        ? [part.const as JsonScalar]
        : undefined;
    if (list) values = [...(values ?? []), ...list];
  }
  return values;
};

const formatOf = (parts: SchemaNode[]): string | undefined =>
  parts.map(part => part.format).find(f => typeof f === 'string') as
    string | undefined;

/**
 * Every field path in a schema, with its types, allowed values and format.
 * The root itself is not a field; each property is, objects included, and an
 * object's properties follow under its path.
 */
export const flattenSchema = (schema: unknown): Map<string, FlatField> => {
  const fields = new Map<string, FlatField>();
  if (!isNode(schema)) return fields;
  const visit = (node: SchemaNode, prefix: string, depth: number) => {
    if (depth > 12) return;
    const parts = merged(schema, node);
    for (const part of parts) {
      const properties = part.properties;
      if (!isNode(properties)) continue;
      for (const [key, child] of Object.entries(properties)) {
        if (!isNode(child)) continue;
        const path = prefix ? `${prefix}.${key}` : key;
        const childParts = merged(schema, child);
        const existing = fields.get(path);
        const types = typesOf(childParts);
        const values = enumOf(childParts);
        const format = formatOf(childParts) ?? existing?.format;
        fields.set(path, {
          types: [...new Set([...(existing?.types ?? []), ...types])].sort(),
          ...(values || existing?.enum
            ? { enum: [...(existing?.enum ?? []), ...(values ?? [])] }
            : {}),
          ...(format ? { format } : {}),
        });
        if (!types.includes('array')) visit(child, path, depth + 1);
      }
    }
  };
  visit(schema, '', 0);
  return fields;
};

const isUnder = (path: string, prefix: string): boolean =>
  path === prefix || path.startsWith(`${prefix}.`);

const quote = (value: unknown) => JSON.stringify(value);

/**
 * Checks one migration step against the two schema versions it spans, and
 * returns a message per gap: a difference the coverage map does not account
 * for, or a map entry naming something that is not a difference (a typo
 * would otherwise cover nothing, silently). Empty when the step is complete.
 */
export const checkCoverage = (
  oldSchema: unknown,
  newSchema: unknown,
  step: MigrationStep
): string[] => {
  const before = flattenSchema(oldSchema);
  const after = flattenSchema(newSchema);
  const at = `v${step.from} → v${stepTarget(step)}`;
  const problems: string[] = [];

  const moved = step.moved ?? {};
  const mapped = step.mapped ?? {};
  const unresolved = step.unresolved ?? {};
  const setAside = [...Object.keys(step.kept ?? {}), ...(step.dropped ?? [])];

  // Every left-hand side names a path the old version has, and every
  // right-hand side one the new version has.
  for (const [from, to] of Object.entries(moved)) {
    if (!before.has(from)) {
      problems.push(
        `${at}: moved names ${from}, which v${step.from} does not have`
      );
    }
    if (!after.has(to)) {
      problems.push(
        `${at}: moved takes ${from} to ${to}, which v${stepTarget(step)} does not have`
      );
    }
    // Every move reads before any writes, so a target that moves away itself
    // (a swap) is free; any other value already there would be overwritten,
    // and dropped is applied after the moves, so it cannot clear the way.
    if (before.has(from) && before.has(to) && movedPath(to, moved) === to) {
      problems.push(
        `${at}: moved takes ${from} to ${to}, which v${step.from} already ` +
          `has, so its value would be overwritten — move ${to} as well`
      );
    }
  }
  for (const path of Object.keys(step.kept ?? {})) {
    if (!before.has(path)) {
      problems.push(
        `${at}: kept names ${path}, which v${step.from} does not have`
      );
    }
    // Kept sets a removed path aside, unchecked beneath it; on a path the new
    // version still has it would hide every change there.
    if (after.has(path)) {
      problems.push(
        `${at}: kept names ${path}, which v${stepTarget(step)} still has — ` +
          'kept is for a removed path; cover a change at it with moved, ' +
          'mapped or unresolved'
      );
    }
  }
  for (const path of step.dropped ?? []) {
    if (!before.has(path)) {
      problems.push(
        `${at}: dropped names ${path}, which v${step.from} does not have`
      );
    }
  }
  for (const path of [...Object.keys(mapped), ...Object.keys(unresolved)]) {
    if (!after.has(path)) {
      problems.push(
        `${at}: ${path} is named in ${path in mapped ? 'mapped' : 'unresolved'}, ` +
          `but v${stepTarget(step)} does not have it`
      );
    }
  }

  const clearedWhole = (path: string) =>
    Object.entries(unresolved).some(
      ([prefix, values]) =>
        retiredValues(values) === 'any' && isUnder(path, prefix)
    );

  // The retired values the map names, so an entry covering nothing is found.
  const retiredAt = new Map<string, Set<JsonScalar>>();

  for (const [path, field] of before) {
    if (setAside.some(prefix => isUnder(path, prefix))) continue;
    const target = movedPath(path, moved);
    if (clearedWhole(target)) continue;
    const next = after.get(target);
    if (!next) {
      // An explicitly moved path whose target is missing is reported above;
      // a path under it lands where the move put its parent.
      if (target === path) {
        problems.push(
          `${at}: ${path} is removed and not covered — add it to moved, kept or dropped`
        );
      } else if (!Object.hasOwn(moved, path)) {
        problems.push(
          `${at}: ${path} moves with its parent to ${target}, which ` +
            `v${stepTarget(step)} does not have — add it to moved, kept or dropped`
        );
      }
      continue;
    }
    if (!field.types.every(type => next.types.includes(type))) {
      problems.push(
        `${at}: ${target} changes type from ${field.types.join('|')} to ` +
          `${next.types.join('|')} and is not covered — add it to unresolved ` +
          "as 'any'"
      );
      continue;
    }
    if (!field.enum || !next.enum) continue;
    for (const value of field.enum) {
      if (next.enum.includes(value)) continue;
      const set = retiredAt.get(target) ?? new Set();
      set.add(value);
      retiredAt.set(target, set);
      const map = mapped[target];
      const list = unresolved[target] && retiredValues(unresolved[target]);
      const covered =
        (typeof value === 'string' && map && Object.hasOwn(map, value)) ||
        (Array.isArray(list) && list.includes(value));
      if (!covered) {
        problems.push(
          `${at}: ${target} value ${quote(value)} is retired and not covered — ` +
            'add it to mapped or unresolved'
        );
      }
    }
  }

  for (const [path, map] of Object.entries(mapped)) {
    for (const value of Object.keys(map)) {
      if (!retiredAt.get(path)?.has(value)) {
        problems.push(
          `${at}: mapped names ${path} value ${quote(value)}, which is not retired`
        );
      }
    }
  }
  for (const [path, values] of Object.entries(unresolved)) {
    const retired = retiredValues(values);
    if (retired === 'any') continue;
    for (const value of retired) {
      if (!retiredAt.get(path)?.has(value)) {
        problems.push(
          `${at}: unresolved names ${path} value ${quote(value)}, which is not retired`
        );
      }
    }
  }

  return problems;
};
