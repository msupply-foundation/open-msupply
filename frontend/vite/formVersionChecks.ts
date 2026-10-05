import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport, type InlineConfig, type Plugin } from 'vite';
import {
  BASE_DOCUMENT_TYPES,
  BASE_SCHEMA_DIR,
  typeDir,
  type DocumentTypeDeclaration,
  type FormsDeclaration,
} from './formPlugins.ts';

/*
 * The versioning checks of a form plugin (kdd/custom-forms/specs.md §
 * Opening an older document), run by scripts/build-plugins.mjs before it
 * packs anything and by scripts/emit-form-schemas.mjs in both modes, so a
 * plugin whose versions do not fit together is never packed or installed:
 *
 *   - every event rule's field paths name a field of the current schema;
 *   - for a type with more than one version, each version's hop to the next
 *     is either a step in `forms/<dir>/migrations.ts` whose coverage map
 *     accounts for every difference between the two schemas, or an additive
 *     change needing no step;
 *   - each earlier version has a fixture, `forms/<dir>/fixtures/v<n>.json`,
 *     that validates against its own version and, migrated to the current
 *     one, against the current schema and the category's base schema, both
 *     of which the host checks every draft against.
 *
 * (The frozen-file and `versions.ts` checks need the schema generator, so
 * they are part of the emit in vite/formPlugins.ts.)
 *
 * The comparison, the migration walk and the validator are the host's own
 * (src/domain/documentForm/schemaDiff.ts, migration.ts, validation.ts), so
 * the build and the form agree by construction. Those modules, and the
 * plugin's `migrations.ts` with the SDK it imports, are written for Vite:
 * extensionless imports, JSX, CSS modules. This module is not, because the
 * scripts load it under plain node with type stripping, and tsconfig.node's
 * `nodenext` resolution cannot type-check the host's imports either. So it
 * loads each of them with Vite's `runnerImport`, under an inline config
 * mirroring vitest.config.ts (where plugin code already runs in node), and
 * types the host modules here by the part it calls.
 */

const MIGRATIONS_FILE = 'migrations.ts';
const FIXTURES_DIR = 'fixtures';

// ── Loading through Vite ────────────────────────────────────────────────────

const FRONTEND_ROOT = fileURLToPath(new URL('..', import.meta.url));
const srcPath = (path: string) =>
  fileURLToPath(new URL(`../src/${path}`, import.meta.url));

/*
 * Stylesheets load as empty modules, as vitest leaves them unprocessed: a
 * component's class names are never read here, and Vite's CSS plugin does
 * not run in `runnerImport`'s environment.
 */
const CSS_STUB = '\0form-version-checks:css';
const stubStylesheets: Plugin = {
  name: 'form-version-checks:stub-css',
  enforce: 'pre',
  resolveId: source => (/\.css(\?|$)/.test(source) ? CSS_STUB : undefined),
  load: id => (id === CSS_STUB ? 'export default {};' : undefined),
};

/*
 * vitest.config.ts's `define` and resolve config, for the environment
 * `runnerImport` creates (named `inline`). Solid and the libraries built on
 * it are processed by Vite rather than handed to node, so they resolve to
 * their browser builds as they do under vitest; node would pick the server
 * builds, whose client-only APIs throw when a component library calls them
 * at module scope. JSX compiles to plain calls: nothing here renders, so no
 * Solid transform is needed, and no component runs at import.
 */
const VITE_CONFIG: InlineConfig = {
  configFile: false,
  root: FRONTEND_ROOT,
  logLevel: 'error',
  plugins: [stubStylesheets],
  define: { APP_VERSION: JSON.stringify('0.0.0-check') },
  oxc: { jsx: { runtime: 'classic' } },
  resolve: {
    alias: {
      '@': srcPath(''),
      '@openmsupply/plugin-sdk': srcPath('plugin-sdk/index.ts'),
    },
  },
  environments: {
    inline: {
      resolve: {
        conditions: ['browser'],
        noExternal: [/solid/, /kobalte/, /corvu/],
      },
    },
  },
};

const load = async (file: string): Promise<unknown> =>
  (await runnerImport(file, VITE_CONFIG)).module;

/** A migration step, as far as the checks read one. */
interface Step {
  readonly from: number;
  readonly to?: number;
}

/** The host modules the checks reuse, typed by the part they call. */
interface HostModules {
  flattenSchema: (schema: unknown) => Map<string, unknown>;
  checkCoverage: (
    oldSchema: unknown,
    newSchema: unknown,
    step: Step
  ) => string[];
  nextStep: (
    steps: readonly Step[],
    at: number,
    to: number
  ) => Step | undefined;
  stepTarget: (step: Step) => number;
  applyMigrations: (
    data: unknown,
    from: number,
    to: number,
    steps: readonly Step[]
  ) => { data: Record<string, unknown> } | undefined;
  validateDocument: (
    schemaId: string,
    schema: Record<string, unknown>,
    data: unknown
  ) => { path: string; keyword: string }[];
}

// Loaded once per process, and only when a plugin has something to check.
let hostModules: Promise<HostModules> | undefined;
const loadHostModules = (): Promise<HostModules> =>
  (hostModules ??= Promise.all(
    [
      'domain/documentForm/schemaDiff.ts',
      'domain/documentForm/migration.ts',
      'domain/documentForm/validation.ts',
    ].map(path => load(srcPath(path)))
  ).then(
    modules =>
      Object.assign({}, ...(modules as object[])) as unknown as HostModules
  ));

// ── Helpers ─────────────────────────────────────────────────────────────────

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const firstLine = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).split('\n')[0];

/** A JSON file's content, or undefined (with a problem) when unreadable. */
const readJson = (path: string, problems: string[]): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    problems.push(`${path}: not readable as JSON — ${firstLine(error)}`);
    return undefined;
  }
};

/*
 * The validator caches by schema id, and this process may check several
 * plugins (or, under test, several versions of one file), so the id is the
 * schema's content.
 */
const validate = (
  host: HostModules,
  schema: Record<string, unknown>,
  data: unknown
): string | undefined => {
  const id = `check:${createHash('sha256').update(JSON.stringify(schema)).digest('hex')}`;
  const errors = host.validateDocument(id, schema, data);
  if (errors.length === 0) return undefined;
  return errors
    .map(error => `${error.path || '(the document)'} (${error.keyword})`)
    .join(', ');
};

// ── Event rules ─────────────────────────────────────────────────────────────

/*
 * The paths the server reads from a document when it runs a rule
 * (DocumentRegistryConfig): a path the schema lacks is never set, so the
 * rule silently never fires.
 */
const checkEventRules = (
  host: HostModules,
  file: string,
  current: Record<string, unknown>,
  version: number
): string[] => {
  if (!existsSync(file)) return [`${file}: events file not found`];
  const problems: string[] = [];
  const rules = readJson(file, problems);
  if (!Array.isArray(rules)) return problems;
  const fields = host.flattenSchema(current);
  rules.forEach((rule, i) => {
    if (!isRecord(rule)) return;
    const paths: [string, unknown][] = [];
    if (Array.isArray(rule.conditions)) {
      rule.conditions.forEach((condition, j) => {
        if (isRecord(condition)) {
          paths.push([`conditions[${j}].field`, condition.field]);
        }
      });
    }
    if (isRecord(rule.event)) {
      paths.push(['event.dataField', rule.event.dataField]);
    }
    if (isRecord(rule.config)) {
      paths.push(['config.datetimeField', rule.config.datetimeField]);
    }
    for (const [where, path] of paths) {
      if (path === undefined) continue;
      if (typeof path === 'string' && fields.has(path)) continue;
      problems.push(
        `${file} [${i}]: ${where} ${JSON.stringify(path)} is not a field of ` +
          `v${version} — name a field of the current schema`
      );
    }
  });
  return problems;
};

// ── Migrations ──────────────────────────────────────────────────────────────

/** The steps `migrations.ts` exports, or the problems that stop reading them. */
const readSteps = async (
  file: string,
  versions: number
): Promise<{ steps: Step[]; problems: string[] }> => {
  let module: unknown;
  try {
    module = await load(file);
  } catch (error) {
    return {
      steps: [],
      problems: [`${file}: cannot be loaded — ${firstLine(error)}`],
    };
  }
  const list = isRecord(module) ? module.migrations : undefined;
  if (!Array.isArray(list)) {
    return {
      steps: [],
      problems: [
        `${file}: must export \`migrations\`, an array of the type's steps ` +
          '(each from defineMigration)',
      ],
    };
  }
  const problems: string[] = [];
  const seen = new Set<string>();
  list.forEach((step, i) => {
    const at = `${file}: migrations[${i}]`;
    if (!isRecord(step)) {
      problems.push(`${at} is not a migration step — use defineMigration`);
      return;
    }
    const { from, to } = step;
    const target = to === undefined && typeof from === 'number' ? from + 1 : to;
    if (
      !Number.isInteger(from) ||
      !Number.isInteger(target) ||
      (from as number) < 1 ||
      (target as number) <= (from as number) ||
      (target as number) > versions
    ) {
      problems.push(
        `${at}: "from" ${JSON.stringify(from)} and "to" ` +
          `${JSON.stringify(target)} must be version numbers with ` +
          `1 ≤ from < to ≤ ${versions} ("to" defaults to from + 1)`
      );
      return;
    }
    const key = `${from}→${target}`;
    if (seen.has(key)) {
      problems.push(
        `${at}: a second step from v${from} to v${target} — keep one`
      );
    }
    seen.add(key);
  });
  return { steps: list as Step[], problems };
};

const checkMigrations = async (
  host: HostModules,
  entry: DocumentTypeDeclaration,
  dir: string,
  schemas: Record<string, unknown>[]
): Promise<string[]> => {
  const current = schemas.length;
  const file = join(dir, MIGRATIONS_FILE);
  const hasFile = existsSync(file);
  const read = hasFile
    ? await readSteps(file, current)
    : { steps: [], problems: [] };
  if (read.problems.length > 0) return read.problems;
  const { steps } = read;
  const problems: string[] = [];

  /*
   * Every version's hop towards the current one, as `applyMigrations` takes
   * it: the step `nextStep` picks, or none for an additive change. Every
   * hop is taken by some document, since each version's fixture (and each
   * document pinned to it) starts from that version.
   */
  for (let at = 1; at < current; at += 1) {
    const step = host.nextStep(steps, at, current);
    if (step) {
      const target = host.stepTarget(step);
      for (const gap of host.checkCoverage(
        schemas[at - 1],
        schemas[target - 1],
        step
      )) {
        problems.push(`${file}: ${gap}`);
      }
      continue;
    }
    for (const gap of host.checkCoverage(schemas[at - 1], schemas[at], {
      from: at,
    })) {
      problems.push(
        hasFile
          ? `${file}: has no step from v${at}, and v${at} → v${at + 1} is ` +
              `not additive, so add one — ${gap}`
          : `${file}: not found, and v${at} → v${at + 1} of ` +
              `${entry.documentType} is not additive, so the type needs ` +
              `this file, with a step from v${at} — ${gap}`
      );
    }
  }

  const base = (BASE_DOCUMENT_TYPES as readonly string[]).includes(
    entry.category
  )
    ? readJson(join(BASE_SCHEMA_DIR, `${entry.category}.json`), problems)
    : undefined;
  const currentFile = entry.versions[current - 1].file;

  for (let version = 1; version < current; version += 1) {
    const fixture = join(dir, FIXTURES_DIR, `v${version}.json`);
    if (!existsSync(fixture)) {
      problems.push(
        `${fixture}: not found — every earlier version needs a fixture, a ` +
          `document as v${version} recorded it, which the build migrates to ` +
          `v${current} and validates; add one`
      );
      continue;
    }
    const data = readJson(fixture, problems);
    if (data === undefined) continue;
    const own = validate(host, schemas[version - 1], data);
    if (own) {
      problems.push(
        `${fixture}: does not validate against v${version} ` +
          `(${entry.versions[version - 1].file}): ${own} — a fixture is a ` +
          `document as v${version} recorded it`
      );
      continue;
    }

    // An additive hop carries the data unchanged, so it must validate as it
    // is against the next version. (The last hop is checked below.)
    let carried: unknown = data;
    let at = version;
    while (at < current - 1) {
      const step = host.nextStep(steps, at, current);
      if (step) {
        const target = host.stepTarget(step);
        carried = host.applyMigrations(carried, at, target, [step])?.data;
        at = target;
        continue;
      }
      const errors = validate(host, schemas[at], carried);
      if (errors) {
        problems.push(
          `${fixture}: v${at} → v${at + 1} has no migration step, so the ` +
            `document must validate unchanged against v${at + 1}, and it ` +
            `does not: ${errors} — add a step from v${at} to ${file}`
        );
      }
      at += 1;
    }

    const migrated = host.applyMigrations(data, version, current, steps)?.data;
    const errors = validate(host, schemas[current - 1], migrated);
    const lastHopAdditive =
      at === current - 1 && !host.nextStep(steps, at, current);
    if (errors && lastHopAdditive) {
      problems.push(
        `${fixture}: v${at} → v${current} has no migration step, so the ` +
          `document must validate unchanged against v${current} ` +
          `(${currentFile}), and it does not: ${errors} — the change is not ` +
          `additive, so add a step from v${at} to ${file}`
      );
    } else if (errors) {
      problems.push(
        `${fixture}: migrated from v${version} to v${current}, it does not ` +
          `validate against v${current} (${currentFile}): ${errors} — fix ` +
          `the migration in ${file} (or the fixture, if it is not a ` +
          `document v${version} could have recorded)`
      );
    }
    const baseErrors = isRecord(base)
      ? validate(host, base, migrated)
      : undefined;
    if (baseErrors) {
      problems.push(
        `${fixture}: migrated from v${version} to v${current}, it does not ` +
          `validate against the ${entry.category} base schema, which the ` +
          `host checks every draft against as well: ${baseErrors} — fix ` +
          `the migration in ${file} (or the fixture)`
      );
    }
  }
  return problems;
};

// ── Entry point ─────────────────────────────────────────────────────────────

/**
 * Every versioning problem in one form plugin, each naming its file and what
 * to do; empty when its versions fit together. A type whose schema files
 * cannot be read is skipped: the emit and the pack report those.
 */
export const checkFormVersions = async (
  pluginDir: string,
  declaration: FormsDeclaration
): Promise<string[]> => {
  const problems: string[] = [];
  for (const entry of declaration.documentTypes) {
    if (!entry.events && entry.versions.length < 2) continue;
    const dir = typeDir(pluginDir, entry);
    const unreadable: string[] = [];
    const schemas = entry.versions.map(version => {
      const file = join(dir, version.file);
      return existsSync(file) ? readJson(file, unreadable) : undefined;
    });
    if (!schemas.every(isRecord)) continue;
    const host = await loadHostModules();
    if (entry.events) {
      problems.push(
        ...checkEventRules(
          host,
          join(dir, entry.events),
          schemas[schemas.length - 1],
          schemas.length
        )
      );
    }
    if (schemas.length > 1) {
      problems.push(...(await checkMigrations(host, entry, dir, schemas)));
    }
  }
  return problems;
};
