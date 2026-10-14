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
 *
 * Separately, the narrowings (`findNarrowings`): a field the new version
 * accepts less of, though nothing is lost, so an old document carried over
 * may fail to validate until someone edits it. The build makes the plugin
 * acknowledge each one (vite/formVersionChecks.ts).
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

// ── Narrowing ───────────────────────────────────────────────────────────────

const LOWER_LIMITS = [
  'minimum',
  'exclusiveMinimum',
  'minLength',
  'minItems',
] as const;
const UPPER_LIMITS = [
  'maximum',
  'exclusiveMaximum',
  'maxLength',
  'maxItems',
] as const;
type Limit = (typeof LOWER_LIMITS)[number] | (typeof UPPER_LIMITS)[number];

/** What a field accepts, as far as a later version can narrow it. */
interface FieldConstraints {
  types: string[];
  enum?: JsonScalar[];
  formats: string[];
  patterns: string[];
  limits: Partial<Record<Limit, number>>;
  /** Whether the object holding the field requires it. */
  required: boolean;
}

const strings = (values: unknown[]): string[] =>
  values.filter((v): v is string => typeof v === 'string');

/*
 * The keys an object requires: its own `required` and its `allOf` branches'.
 * An `anyOf` or `oneOf` branch's requirement holds only on that branch, so it
 * does not make the key required.
 */
const requiredKeys = (root: SchemaNode, node: SchemaNode): Set<string> => {
  const self = resolveRef(root, node);
  const keys = new Set(
    Array.isArray(self.required) ? strings(self.required) : []
  );
  if (Array.isArray(self.allOf)) {
    for (const branch of self.allOf) {
      if (isNode(branch))
        for (const key of requiredKeys(root, branch)) keys.add(key);
    }
  }
  return keys;
};

/*
 * Every field's constraints, by path, following arrays into their items as
 * `path[]` (`contactDetails[].region`), where `flattenSchema` stops. Where
 * several parts of a field set one limit, the strictest is taken.
 */
const flattenConstraints = (schema: unknown): Map<string, FieldConstraints> => {
  const fields = new Map<string, FieldConstraints>();
  if (!isNode(schema)) return fields;
  const record = (path: string, parts: SchemaNode[], required: boolean) => {
    const existing = fields.get(path);
    const values = enumOf(parts);
    const limits = { ...existing?.limits };
    for (const part of parts) {
      for (const key of [...LOWER_LIMITS, ...UPPER_LIMITS]) {
        const value = part[key];
        if (typeof value !== 'number') continue;
        const held = limits[key];
        const lower = (LOWER_LIMITS as readonly string[]).includes(key);
        limits[key] =
          held === undefined
            ? value
            : lower
              ? Math.max(held, value)
              : Math.min(held, value);
      }
    }
    fields.set(path, {
      types: [
        ...new Set([...(existing?.types ?? []), ...typesOf(parts)]),
      ].sort(),
      ...(values || existing?.enum
        ? { enum: [...(existing?.enum ?? []), ...(values ?? [])] }
        : {}),
      formats: [
        ...new Set([
          ...(existing?.formats ?? []),
          ...strings(parts.map(part => part.format)),
        ]),
      ],
      patterns: [
        ...new Set([
          ...(existing?.patterns ?? []),
          ...strings(parts.map(part => part.pattern)),
        ]),
      ],
      limits,
      required: (existing?.required ?? false) || required,
    });
  };
  const visit = (node: SchemaNode, prefix: string, depth: number) => {
    if (depth > 12) return;
    const required = requiredKeys(schema, node);
    for (const part of merged(schema, node)) {
      if (!isNode(part.properties)) continue;
      for (const [key, child] of Object.entries(part.properties)) {
        if (!isNode(child)) continue;
        const path = prefix ? `${prefix}.${key}` : key;
        enter(child, path, required.has(key), depth + 1);
      }
    }
  };
  const enter = (
    node: SchemaNode,
    path: string,
    required: boolean,
    depth: number
  ) => {
    const parts = merged(schema, node);
    record(path, parts, required);
    visit(node, path, depth);
    for (const part of parts) {
      if (isNode(part.items) && depth <= 12) {
        enter(part.items, `${path}[]`, false, depth + 1);
      }
    }
  };
  visit(schema, '', 0);
  return fields;
};

/** The object a field belongs to: `a` for `a.b`, `a[]` for `a[].b`. */
const parentOf = (path: string): string => {
  const dot = path.lastIndexOf('.');
  return dot < 0 ? '' : path.slice(0, dot);
};

/** One field the new version accepts less of, and each way it does. */
export interface Narrowing {
  path: string;
  changes: string[];
}

/**
 * Every field the new version accepts less of than the old one: newly
 * required (where old documents can hold the object it belongs to), a free
 * text field given an enum, a format or pattern added or changed (two
 * patterns cannot be compared, so any change counts), and a limit added or
 * made stricter; inside arrays too. Old fields are compared where the step's
 * moves land them. Not counted here: a removed path, a retired enum value and
 * a changed type, which `checkCoverage` has a step cover; a field the step
 * clears whole (`unresolved` `'any'`), since no old value is left to fail; and
 * `additionalProperties`, `const`, `if`/`then`/`else`, `not` and changes
 * inside `anyOf`/`oneOf` branches beyond their merged constraints.
 */
export const findNarrowings = (
  oldSchema: unknown,
  newSchema: unknown,
  step: MigrationStep
): Narrowing[] => {
  const moved = step.moved ?? {};
  // Moves name paths outside arrays, so an item path moves with its array.
  const landed = (path: string) => {
    const items = path.indexOf('[]');
    return items < 0
      ? movedPath(path, moved)
      : `${movedPath(path.slice(0, items), moved)}${path.slice(items)}`;
  };
  const before = new Map<string, FieldConstraints>();
  for (const [path, field] of flattenConstraints(oldSchema)) {
    before.set(landed(path), field);
  }
  const after = flattenConstraints(newSchema);
  const cleared = (path: string) =>
    Object.entries(step.unresolved ?? {}).some(
      ([prefix, values]) =>
        retiredValues(values) === 'any' &&
        (isUnder(path, prefix) || path.startsWith(`${prefix}[]`))
    );

  const narrowings: Narrowing[] = [];
  for (const [path, next] of after) {
    if (cleared(path)) continue;
    const old = before.get(path);
    const changes: string[] = [];
    const parent = parentOf(path);
    if (
      next.required &&
      !old?.required &&
      (parent === '' || before.has(parent))
    ) {
      changes.push('is newly required');
    }
    // A new field holds no old value; a changed type is checkCoverage's.
    if (!old || !old.types.every(type => next.types.includes(type))) {
      if (changes.length) narrowings.push({ path, changes });
      continue;
    }
    if (next.enum && !old.enum) changes.push('is given an enum');
    for (const format of next.formats) {
      if (old.formats.includes(format)) continue;
      changes.push(
        old.formats.length
          ? `changes format from ${old.formats.map(quote).join('|')} to ${quote(format)}`
          : `gains format ${quote(format)}`
      );
    }
    for (const pattern of next.patterns) {
      if (old.patterns.includes(pattern)) continue;
      changes.push(
        old.patterns.length
          ? `changes pattern from ${old.patterns.map(quote).join('|')} to ${quote(pattern)}`
          : `gains pattern ${quote(pattern)}`
      );
    }
    for (const key of [...LOWER_LIMITS, ...UPPER_LIMITS]) {
      const value = next.limits[key];
      if (value === undefined) continue;
      const held = old.limits[key];
      const lower = (LOWER_LIMITS as readonly string[]).includes(key);
      if (held === undefined) {
        changes.push(`gains ${key} ${value}`);
      } else if (lower ? value > held : value < held) {
        changes.push(
          `${lower ? 'raises' : 'lowers'} ${key} from ${held} to ${value}`
        );
      }
    }
    if (changes.length) narrowings.push({ path, changes });
  }
  return narrowings;
};

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
  // Two moves writing one place lose a value, whichever runs second: the same
  // target, or one target inside the other.
  const moves = Object.entries(moved);
  moves.forEach(([from, to], i) => {
    for (const [otherFrom, otherTo] of moves.slice(i + 1)) {
      if (isUnder(to, otherTo) || isUnder(otherTo, to)) {
        problems.push(
          `${at}: moved takes ${from} to ${to} and ${otherFrom} to ` +
            `${otherTo}, ${to === otherTo ? 'the same path' : 'one inside the other'}, ` +
            'so one value would overwrite the other — give each its own path'
        );
      }
    }
  });
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
  /*
   * A free text field the new version gives an enum: its old values are not
   * listed anywhere, so any value outside the enum counts as retired, and a
   * step may map or unresolve the spellings records hold. The rest are a
   * narrowing (findNarrowings), which the plugin acknowledges.
   */
  const enumGainedAt = new Map<string, JsonScalar[]>();

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
    if (!field.enum && next.enum) enumGainedAt.set(target, next.enum);
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
            'add it to mapped or unresolved, or, where the value records what ' +
            'happened (a fact about that visit), keep it in the new ' +
            "version's enum and list it in its SelectInput's retired"
        );
      }
    }
  }

  const retired = (path: string, value: JsonScalar) =>
    retiredAt.get(path)?.has(value) ||
    enumGainedAt.get(path)?.includes(value) === false;
  for (const [path, map] of Object.entries(mapped)) {
    for (const value of Object.keys(map)) {
      if (!retired(path, value)) {
        problems.push(
          `${at}: mapped names ${path} value ${quote(value)}, which is not retired`
        );
      }
    }
  }
  for (const [path, values] of Object.entries(unresolved)) {
    const listed = retiredValues(values);
    if (listed === 'any') continue;
    for (const value of listed) {
      if (!retired(path, value)) {
        problems.push(
          `${at}: unresolved names ${path} value ${quote(value)}, which is not retired`
        );
      }
    }
  }

  return problems;
};
