/*
 * Migrations between a document type's schema versions
 * (kdd/custom-forms/specs.md § Opening an older document): what lets the
 * current form edit a document pinned to an earlier version. Applied in
 * memory to the loaded data, never to a stored row; a save then writes a new
 * version under the current schema, as any edit does.
 *
 * A migration is mostly its COVERAGE MAP: plain data saying how each
 * difference between two schema versions is handled. The map is what the
 * build check compares with the diff of the two schemas (schemaDiff.ts), so
 * a difference nobody accounted for fails the build instead of reaching a
 * form that cannot show it. `transform` is the escape hatch for what the map
 * cannot express, and counts for no coverage.
 *
 * Old paths (the map's left-hand sides) are plain strings: migrations are
 * typed from `unknown`, so no old type file has to be kept, and the build
 * check verifies them against the old schema. New paths and mapped values are
 * checked by the compiler against the type the step migrates to.
 */
import {
  getAt,
  setAt,
  type EnumPath,
  type Path,
  type PathValue,
} from './paths';

/** A value a coverage map can name: what JSON holds at a leaf. */
export type JsonScalar = string | number | boolean | null;

/**
 * The escape hatch: runs after the map, on the migrated copy, and edits it in
 * place. `unresolve` clears a path and records the value it held, as the
 * map's `unresolved` does, with the label to show it under when given.
 */
export type MigrationTransform = (
  data: Record<string, unknown>,
  unresolve: (path: string, oldValue: unknown, label?: () => string) => void
) => void;

/**
 * The old values a coverage map marks unresolved at one path: a list, shown
 * as stored; each retired value with its label, shown under the label; or
 * `'any'`, whatever the path holds (a changed type).
 */
export type UnresolvedValues =
  readonly JsonScalar[] | Readonly<Record<string, () => string>> | 'any';

/** The retired values an `unresolved` entry names, or `'any'`. */
export const retiredValues = (
  values: UnresolvedValues
): readonly JsonScalar[] | 'any' =>
  values === 'any' || Array.isArray(values)
    ? (values as readonly JsonScalar[] | 'any')
    : Object.keys(values);

/** A value a migration cleared, as the form shows it. */
export interface UnresolvedValue {
  value: unknown;
  /** Its name, where the migration gives one; else the value is shown. */
  label?: () => string;
}

/**
 * One migration step, typed against `T`, the document type it migrates TO
 * (usually the current one). Written through `defineMigration<T>(…)`.
 */
export interface Migration<T extends object> {
  /**
   * The schema version it migrates from: its 1-based position in `versions`.
   */
  from: number;
  /**
   * The version it migrates to; `from + 1` when absent. Greater for a step
   * squashed from several, once an intermediate type is no longer kept.
   */
  to?: number;
  /** Old path → new path. A whole object moves by naming its path. */
  moved?: Readonly<Record<string, Path<T>>>;
  /** Current enum path → { old value: current value }. */
  mapped?: {
    readonly [P in EnumPath<T>]?: Readonly<
      Record<string, NonNullable<PathValue<T, P>>>
    >;
  };
  /**
   * Current path → the old values the current schema rejects, or `'any'` to
   * clear whatever the path holds (a changed type). The value is cleared and
   * recorded against the path, and the form shows it as previously recorded
   * until a current value is chosen. Naming each value with a label
   * (`{ LEGACY_TRIAL: () => t('regimen.LEGACY_TRIAL') }`) shows it under that
   * name, since the current form's options no longer label it.
   */
  unresolved?: { readonly [P in Path<T>]?: UnresolvedValues };
  /**
   * Old path → its label. The value stays in the document, round-trips on
   * save, and is listed read-only at the end of the form under the label.
   */
  kept?: Readonly<Record<string, () => string>>;
  /** Old paths removed from the document, deliberately. */
  dropped?: readonly string[];
  transform?: MigrationTransform;
}

/**
 * A migration step with its paths erased to strings: how the host and the
 * build read any plugin's steps, whatever type each was written against.
 */
export interface MigrationStep {
  readonly from: number;
  readonly to?: number;
  readonly moved?: Readonly<Record<string, string>>;
  readonly mapped?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly unresolved?: Readonly<Record<string, UnresolvedValues>>;
  readonly kept?: Readonly<Record<string, () => string>>;
  readonly dropped?: readonly string[];
  readonly transform?: MigrationTransform;
}

/** The version a step migrates to. */
export const stepTarget = (step: MigrationStep): number =>
  step.to ?? step.from + 1;

export interface MigrationResult {
  data: Record<string, unknown>;
  /** Current path → the value a step cleared from it. */
  unresolved: Record<string, UnresolvedValue>;
}

const isUnder = (path: string, prefix: string): boolean =>
  path === prefix || path.startsWith(`${prefix}.`);

/** Where `path` lands after `moved`: renamed by its longest moved prefix. */
export const movedPath = (
  path: string,
  moved: Readonly<Record<string, string>> | undefined
): string => {
  let best: string | undefined;
  for (const from of Object.keys(moved ?? {})) {
    if (isUnder(path, from) && (!best || from.length > best.length)) {
      best = from;
    }
  }
  return best === undefined
    ? path
    : `${(moved as Record<string, string>)[best]}${path.slice(best.length)}`;
};

const applyStep = (
  data: Record<string, unknown>,
  step: MigrationStep,
  unresolved: Record<string, UnresolvedValue>
): void => {
  // Every moved value is read before any is written, so two paths that swap
  // places do not overwrite each other.
  const moves = Object.entries(step.moved ?? {}).map(([from, to]) => ({
    to,
    value: getAt(data, from),
  }));
  for (const from of Object.keys(step.moved ?? {}))
    setAt(data, from, undefined);
  for (const { to, value } of moves) {
    if (value !== undefined) setAt(data, to, value);
  }
  // A value an earlier step left unresolved moves with its field.
  for (const [path, value] of Object.entries(unresolved)) {
    const next = movedPath(path, step.moved);
    if (next === path) continue;
    delete unresolved[path];
    unresolved[next] = value;
  }

  for (const [path, mapping] of Object.entries(step.mapped ?? {})) {
    const value = getAt(data, path);
    if (typeof value === 'string' && Object.hasOwn(mapping, value)) {
      setAt(data, path, mapping[value]);
    }
  }

  const unresolve = (path: string, oldValue: unknown, label?: () => string) => {
    unresolved[path] = label ? { value: oldValue, label } : { value: oldValue };
    setAt(data, path, undefined);
  };
  for (const [path, values] of Object.entries(step.unresolved ?? {})) {
    const value = getAt(data, path);
    if (value === undefined) continue;
    const retired = retiredValues(values);
    if (retired !== 'any' && !retired.includes(value as JsonScalar)) continue;
    const labelled = values !== 'any' && !Array.isArray(values);
    unresolve(
      path,
      value,
      labelled && typeof value === 'string'
        ? (values as Readonly<Record<string, () => string>>)[value]
        : undefined
    );
  }

  for (const path of step.dropped ?? []) setAt(data, path, undefined);

  step.transform?.(data, unresolve);
};

/**
 * Runs the steps that take a document from version `from` to version `to`,
 * on a copy of `data`. At each version it takes the step reaching furthest
 * without passing `to`, so a squashed step is preferred to the single steps
 * it replaced. A version with no step is an additive change, which needs
 * none: the data carries on unchanged to the next version (the plugin build
 * checks that every such change really is additive). Undefined only when
 * `from` is past `to`, which no migration can go back from.
 */
export const applyMigrations = (
  data: unknown,
  from: number,
  to: number,
  steps: readonly MigrationStep[]
): MigrationResult | undefined => {
  if (from > to) return undefined;
  const copy = structuredClone(
    (data ?? {}) as Record<string, unknown>
  ) as Record<string, unknown>;
  const unresolved: Record<string, UnresolvedValue> = {};
  let at = from;
  while (at < to) {
    const step = nextStep(steps, at, to);
    if (step) applyStep(copy, step, unresolved);
    at = step ? stepTarget(step) : at + 1;
  }
  return { data: copy, unresolved };
};

/**
 * The step `applyMigrations` takes at version `at` on the way to `to`, or
 * undefined for an additive change with no step.
 */
export const nextStep = (
  steps: readonly MigrationStep[],
  at: number,
  to: number
): MigrationStep | undefined =>
  steps
    .filter(s => s.from === at && stepTarget(s) > at && stepTarget(s) <= to)
    .sort((a, b) => stepTarget(b) - stepTarget(a))[0];

export interface KeptField {
  path: string;
  label: () => string;
}

/**
 * Every path a type's migrations keep, with its label. The host lists the
 * ones a document holds a value at, whichever version it is pinned to: a
 * kept value round-trips on save, so it is still there after the document
 * is re-pinned to the current version.
 */
export const keptFields = (steps: readonly MigrationStep[]): KeptField[] => {
  const seen = new Set<string>();
  const fields: KeptField[] = [];
  for (const step of steps) {
    for (const [path, label] of Object.entries(step.kept ?? {})) {
      if (seen.has(path)) continue;
      seen.add(path);
      fields.push({ path, label });
    }
  }
  return fields;
};
