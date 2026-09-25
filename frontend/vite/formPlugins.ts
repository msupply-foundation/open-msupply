import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type * as Prettier from 'prettier';
import {
  DEFAULT_CONFIG,
  createGenerator,
  createProgram,
  ts,
  type CompletedConfig,
} from 'ts-json-schema-generator';

/*
 * The FORM half of a plugin (kdd/custom-forms/specs.md § What a plugin
 * package contains): the document types it owns, every JSON Schema version
 * of each, and their event rules — declared as data in `forms/forms.json` so
 * the server can install them without evaluating the plugin's JavaScript.
 *
 * Three consumers, one module, so they cannot disagree about the layout:
 *   - scripts/emit-form-schemas.mjs emits each type's CURRENT schema version
 *     from its TypeScript type, or checks the committed file still matches;
 *   - scripts/build-plugins.mjs emits, then packs the declaration and the
 *     schema files into the bundle's `form_plugins` list — the Rust
 *     `PluginBundle` field the server's install reads;
 *   - the unit tests next to this file.
 *
 * The layout, per plugin directory:
 *
 *   forms/forms.json            the declaration (FormsDeclaration below)
 *   forms/<dir>/type.ts         the current type, the source of truth
 *   forms/<dir>/v1.json, ...    the emitted schema versions, oldest first
 *   forms/<dir>/v1.ts           an archived type, where one is kept
 *   forms/<dir>/events.json     the type's event rules, optional
 *
 * Only the LAST declared version is ever regenerated. Every earlier one has
 * been published, so documents on some site are pinned to its id: its file
 * is frozen, and a changed type is a new version, never an edit to an old
 * one. The emit writes an earlier version only when its file does not exist
 * yet, from its archived type, which is how a history begins.
 */

/** The declaration's path inside a plugin directory. */
export const FORMS_DECLARATION = join('forms', 'forms.json');

const FORMS_DIR = 'forms';

/** The Rust `DocumentRegistryCategory` variant names. */
export const DOCUMENT_REGISTRY_CATEGORIES = [
  'Patient',
  'ProgramEnrolment',
  'Encounter',
  'ContactTrace',
  'Custom',
] as const;
export type DocumentRegistryCategory =
  (typeof DOCUMENT_REGISTRY_CATEGORIES)[number];

/*
 * The server hard-codes this document type for patients
 * (server/util/src/constants.rs PATIENT_TYPE): a patient document of any
 * other type is never read as the patient. So the Patient category takes
 * exactly this name, and no other category may use it.
 */
const PATIENT_DOCUMENT_TYPE = 'Patient';

export interface SchemaVersionDeclaration {
  /** The emitted schema, relative to the type's directory. */
  file: string;
  /**
   * The TypeScript file the schema is generated from, relative to the type's
   * directory. Required on the last version; on an earlier one it names the
   * archived type the frozen file was generated from.
   */
  source?: string;
  /** The exported interface or type alias in `source`. */
  type?: string;
}

export interface DocumentTypeDeclaration {
  documentType: string;
  category: DocumentRegistryCategory;
  /** The registry entry's display name. */
  name: string;
  /** One of the plugin's `programKeys`; absent for the Patient category. */
  programKey?: string;
  /** The type's directory under `forms/`; defaults to `documentType`. */
  dir: string;
  /** Every schema version ever published, oldest first. */
  versions: SchemaVersionDeclaration[];
  /** The event rules file, relative to the type's directory. */
  events?: string;
}

export interface FormsDeclaration {
  programKeys: string[];
  documentTypes: DocumentTypeDeclaration[];
}

// ── The bundle rows (Rust field names) ──────────────────────────────────────

/* eslint-disable camelcase -- the Rust form plugin rows' field names. */
export interface FormSchemaVersionRow {
  id: string;
  json_schema: Record<string, unknown>;
}

export interface FormDocumentTypeRow {
  document_type: string;
  category: DocumentRegistryCategory;
  name: string;
  program_key: string | null;
  versions: FormSchemaVersionRow[];
  config: { events: unknown[] } | null;
}

export interface FormPluginRow {
  plugin_code: string;
  program_keys: string[];
  document_types: FormDocumentTypeRow[];
}
/* eslint-enable camelcase */

// ── Declaration ─────────────────────────────────────────────────────────────

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

// A declared path stays inside the directory it is relative to: the pack
// reads nothing the plugin directory does not contain.
const isContainedPath = (value: string): boolean =>
  !isAbsolute(value) && !value.split(/[\\/]/).includes('..');

const DECLARATION_KEYS = new Set(['programKeys', 'documentTypes']);
const DOCUMENT_TYPE_KEYS = new Set([
  'documentType',
  'category',
  'name',
  'programKey',
  'dir',
  'versions',
  'events',
]);
const VERSION_KEYS = new Set(['file', 'source', 'type']);

// An unknown key is refused rather than ignored: a misspelt `programKey`
// would otherwise read as "no program key" and fail far from the typo.
const unknownKeys = (
  record: Record<string, unknown>,
  known: Set<string>,
  where: string,
  problems: string[]
) => {
  for (const key of Object.keys(record)) {
    if (!known.has(key)) problems.push(`${where}: unknown key "${key}"`);
  }
};

const parseVersion = (
  raw: unknown,
  where: string,
  problems: string[]
): SchemaVersionDeclaration | undefined => {
  if (!isRecord(raw)) {
    problems.push(`${where}: must be an object`);
    return undefined;
  }
  unknownKeys(raw, VERSION_KEYS, where, problems);
  const { file, source, type } = raw;
  if (!isNonEmptyString(file) || !file.endsWith('.json')) {
    problems.push(`${where}: "file" must name a .json file`);
    return undefined;
  }
  if (!isContainedPath(file)) {
    problems.push(`${where}: "file" must stay inside the type's directory`);
  }
  if ((source === undefined) !== (type === undefined)) {
    problems.push(`${where}: "source" and "type" go together — give both`);
  }
  if (source !== undefined && !isNonEmptyString(source)) {
    problems.push(`${where}: "source" must be a non-empty string`);
  } else if (source !== undefined && !isContainedPath(source)) {
    problems.push(`${where}: "source" must stay inside the type's directory`);
  }
  if (type !== undefined && !isNonEmptyString(type)) {
    problems.push(`${where}: "type" must be a non-empty string`);
  }
  return {
    file,
    ...(isNonEmptyString(source) ? { source } : {}),
    ...(isNonEmptyString(type) ? { type } : {}),
  };
};

const parseDocumentType = (
  raw: unknown,
  where: string,
  programKeys: readonly string[],
  problems: string[]
): DocumentTypeDeclaration | undefined => {
  if (!isRecord(raw)) {
    problems.push(`${where}: must be an object`);
    return undefined;
  }
  unknownKeys(raw, DOCUMENT_TYPE_KEYS, where, problems);
  const { documentType, category, name, programKey, dir, versions, events } =
    raw;
  if (!isNonEmptyString(documentType)) {
    problems.push(`${where}: "documentType" must be a non-empty string`);
    return undefined;
  }
  const at = `${where} (${documentType})`;
  if (
    typeof category !== 'string' ||
    !(DOCUMENT_REGISTRY_CATEGORIES as readonly string[]).includes(category)
  ) {
    problems.push(
      `${at}: "category" must be one of ${DOCUMENT_REGISTRY_CATEGORIES.join(', ')}`
    );
    return undefined;
  }
  if (!isNonEmptyString(name)) {
    problems.push(`${at}: "name" must be a non-empty string`);
  }
  /*
   * The program rules the server's install relies on: a patient entry takes
   * the `Patient` context and belongs to no program, and every other entry
   * takes its program's context, chosen at install for one of the plugin's
   * declared keys — an entry with no key could never be given one.
   */
  if (category === 'Patient') {
    if (documentType !== PATIENT_DOCUMENT_TYPE) {
      problems.push(
        `${at}: the Patient category must have document type ` +
          `"${PATIENT_DOCUMENT_TYPE}" — the server reads patients by that name`
      );
    }
    if (programKey !== undefined && programKey !== null) {
      problems.push(`${at}: a Patient entry belongs to no program`);
    }
  } else {
    if (documentType === PATIENT_DOCUMENT_TYPE) {
      problems.push(
        `${at}: document type "${PATIENT_DOCUMENT_TYPE}" is reserved for ` +
          'the Patient category'
      );
    }
    if (!isNonEmptyString(programKey)) {
      problems.push(`${at}: a ${category} entry needs a "programKey"`);
    } else if (!programKeys.includes(programKey)) {
      problems.push(
        `${at}: program key "${programKey}" is not in "programKeys" ` +
          `(${programKeys.join(', ') || 'none declared'})`
      );
    }
  }
  if (dir !== undefined && (!isNonEmptyString(dir) || !isContainedPath(dir))) {
    problems.push(`${at}: "dir" must be a directory inside forms/`);
  }
  if (events !== undefined && !isNonEmptyString(events)) {
    problems.push(`${at}: "events" must name a file`);
  } else if (events !== undefined && !isContainedPath(events)) {
    problems.push(`${at}: "events" must stay inside the type's directory`);
  }
  if (!Array.isArray(versions) || versions.length === 0) {
    problems.push(`${at}: "versions" must list at least one version`);
    return undefined;
  }
  const parsed = versions.map((version, i) =>
    parseVersion(version, `${at} versions[${i}]`, problems)
  );
  const files = parsed.map(version => version?.file);
  files.forEach((file, i) => {
    if (file !== undefined && files.indexOf(file) !== i) {
      problems.push(`${at}: version file "${file}" is listed twice`);
    }
  });
  const current = parsed.at(-1);
  if (current && (!current.source || !current.type)) {
    problems.push(
      `${at}: the last version is the current one, so it needs "source" ` +
        'and "type" — the TypeScript type its schema is emitted from'
    );
  }
  return {
    documentType,
    category: category as DocumentRegistryCategory,
    name: typeof name === 'string' ? name : '',
    ...(isNonEmptyString(programKey) ? { programKey } : {}),
    dir: isNonEmptyString(dir) ? dir : documentType,
    versions: parsed.filter(
      (version): version is SchemaVersionDeclaration => version !== undefined
    ),
    ...(isNonEmptyString(events) ? { events } : {}),
  };
};

/**
 * Validate a parsed `forms/forms.json`. Every problem is collected and
 * thrown together, each naming where it is, so one run shows them all.
 */
export const parseFormsDeclaration = (
  raw: unknown,
  where: string
): FormsDeclaration => {
  const problems: string[] = [];
  if (!isRecord(raw)) {
    throw new Error(`${where}: must be a JSON object`);
  }
  unknownKeys(raw, DECLARATION_KEYS, where, problems);
  const programKeys = Array.isArray(raw.programKeys) ? raw.programKeys : [];
  if (
    !Array.isArray(raw.programKeys) ||
    !programKeys.every(key => isNonEmptyString(key))
  ) {
    problems.push(`${where}: "programKeys" must be an array of strings`);
  }
  const keys = programKeys.filter(isNonEmptyString);
  keys.forEach((key, i) => {
    if (keys.indexOf(key) !== i) {
      problems.push(`${where}: program key "${key}" is listed twice`);
    }
  });
  if (!Array.isArray(raw.documentTypes) || raw.documentTypes.length === 0) {
    problems.push(`${where}: "documentTypes" must list at least one type`);
  }
  const documentTypes = (
    Array.isArray(raw.documentTypes) ? raw.documentTypes : []
  )
    .map((entry, i) =>
      parseDocumentType(entry, `${where} documentTypes[${i}]`, keys, problems)
    )
    .filter((entry): entry is DocumentTypeDeclaration => entry !== undefined);
  // One owner per document type: within a plugin, one entry per type. (Across
  // plugins, the server's install refuses a type another plugin owns.)
  const names = documentTypes.map(entry => entry.documentType);
  names.forEach((name, i) => {
    if (names.indexOf(name) !== i) {
      problems.push(`${where}: document type "${name}" is declared twice`);
    }
  });
  const dirs = documentTypes.map(entry => entry.dir);
  dirs.forEach((dir, i) => {
    if (dirs.indexOf(dir) !== i) {
      problems.push(`${where}: directory "forms/${dir}" is used twice`);
    }
  });
  if (problems.length > 0) {
    throw new Error(
      `invalid form plugin declaration:\n  - ${problems.join('\n  - ')}`
    );
  }
  return { programKeys: keys, documentTypes };
};

const readJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (cause) {
    throw new Error(`${path}: not readable as JSON`, { cause });
  }
};

/** A plugin directory's form declaration, or undefined if it has none. */
export const readFormsDeclaration = (
  pluginDir: string
): FormsDeclaration | undefined => {
  const path = join(pluginDir, FORMS_DECLARATION);
  if (!existsSync(path)) return undefined;
  return parseFormsDeclaration(readJson(path), path);
};

const typeDir = (pluginDir: string, entry: DocumentTypeDeclaration) =>
  join(pluginDir, FORMS_DIR, entry.dir);

// ── Canonical JSON and version ids ──────────────────────────────────────────

/*
 * One serialiser for both forms, so the file on disk and the hash agree on
 * key order by construction. Object keys are sorted (UTF-16 code-unit order,
 * which is what Array.prototype.sort gives), arrays keep their order.
 * Written out rather than JSON.stringify over sorted objects, because a JS
 * object always enumerates integer-like keys first, whatever order they
 * were inserted in.
 */
const serialise = (value: unknown, indent: string | undefined): string => {
  const inner = indent === undefined ? undefined : `${indent}  `;
  const open = inner === undefined ? '' : `\n${inner}`;
  const close = indent === undefined ? '' : `\n${indent}`;
  const comma = inner === undefined ? ',' : `,\n${inner}`;
  const colon = indent === undefined ? ':' : ': ';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map(item => serialise(item, inner));
    return `[${open}${items.join(comma)}${close}]`;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    if (keys.length === 0) return '{}';
    const members = keys.map(
      key => `${JSON.stringify(key)}${colon}${serialise(value[key], inner)}`
    );
    return `{${open}${members.join(comma)}${close}}`;
  }
  return JSON.stringify(value);
};

/** Keys sorted recursively, no whitespace — what a version id hashes. */
export const canonicalJson = (value: unknown): string =>
  serialise(value, undefined);

/**
 * `<plugin_code>_<document_type>_v<n>_<hash>`: `n` is the version's 1-based
 * position, `hash` the first 12 hex characters of the SHA-256 of the
 * schema's canonical JSON. Content-addressed, so re-packing an unchanged
 * schema gives the same id and re-installing it changes nothing.
 */
export const schemaVersionId = (
  pluginCode: string,
  documentType: string,
  position: number,
  schema: unknown
): string => {
  const hash = createHash('sha256')
    .update(canonicalJson(schema), 'utf8')
    .digest('hex')
    .slice(0, 12);
  return `${pluginCode}_${documentType}_v${position}_${hash}`;
};

// ── Type to schema ──────────────────────────────────────────────────────────

/*
 * The plugin tsconfig, so `@openmsupply/plugin-sdk` resolves exactly as it
 * does when the plugin is type-checked and built: to the SDK's source,
 * through the path mapping.
 */
const PLUGINS_TSCONFIG = fileURLToPath(
  new URL('../tsconfig.plugins.json', import.meta.url)
);

/**
 * The post-processing programschemas' `fix_generated_schema.ts` applies, so
 * an emitted schema has the shape the deployed JSON Forms schemas have: the
 * root is an object that is `allOf` its type's definition, instead of a bare
 * `$ref`.
 */
export const toDocumentSchema = (
  generated: Record<string, unknown>,
  typeName: string
): Record<string, unknown> => {
  const { $ref: _ref, ...rest } = generated;
  return {
    ...rest,
    type: 'object',
    allOf: [{ $ref: `#/definitions/${typeName}` }],
  };
};

/**
 * A generator over one set of sources: a plugin's `forms/`, or the SDK's base
 * document types. One TS program serves every type in the set, since building
 * it (the files plus the SDK graph they import) is most of the cost.
 */
const createSchemaGenerator = (sourceGlob: string) => {
  const config: CompletedConfig = {
    ...DEFAULT_CONFIG,
    path: sourceGlob,
    tsconfig: PLUGINS_TSCONFIG,
    /*
     * `tsc -b` type-checks these files under the same tsconfig, with its
     * ambient globals, which a program rooted at the forms sources alone
     * does not have. Checking here as well would only fail on those.
     */
    skipTypeCheck: true,
    // An object keeps properties the type does not name: a document written
    // by a newer form, or by the old UI, still validates.
    additionalProperties: true,
  };
  const program = createProgram(config);
  const generator = createGenerator({ ...config, tsProgram: program });
  return (sourcePath: string, typeName: string): Record<string, unknown> => {
    const fileName = resolve(sourcePath).split(sep).join('/');
    const sourceFile = program.getSourceFile(fileName);
    if (!sourceFile) throw new Error(`${sourcePath}: source file not found`);
    /*
     * Looked up in its own file rather than by name across the program: the
     * program holds the SDK too, and a plugin type may share a name with an
     * SDK base type. `ts` is the generator's own TypeScript, whose syntax
     * kinds are the ones its nodes carry.
     */
    const node = sourceFile.statements.find(
      statement =>
        (ts.isInterfaceDeclaration(statement) ||
          ts.isTypeAliasDeclaration(statement)) &&
        statement.name.text === typeName &&
        statement.modifiers?.some(
          modifier => modifier.kind === ts.SyntaxKind.ExportKeyword
        )
    );
    if (!node) {
      throw new Error(
        `${sourcePath}: no exported interface or type alias "${typeName}"`
      );
    }
    const schema = generator.createSchemaFromNodes([node]);
    return toDocumentSchema(schema as Record<string, unknown>, typeName);
  };
};

/*
 * Prettier through Node's own resolution. Under vitest, whose config resolves
 * with the `browser` condition, a plain import is Prettier's standalone
 * build, which has no config resolution and no bundled parsers.
 */
const prettier = createRequire(import.meta.url)('prettier') as typeof Prettier;

/**
 * The file text for a schema: sorted keys, then Prettier with the repo's own
 * config, so the file is byte-stable across runs and `pnpm format` leaves it
 * as it is.
 */
export const schemaFileText = async (
  schema: unknown,
  filePath: string
): Promise<string> => {
  const options = (await prettier.resolveConfig(filePath)) ?? {};
  return prettier.format(serialise(schema, ''), {
    ...options,
    filepath: filePath,
  });
};

export interface EmitResult {
  /** Files written because their content changed. */
  written: string[];
  /** Files already matching their type. */
  unchanged: string[];
  /** Stale or missing files (check) or files that cannot be emitted. */
  problems: string[];
}

/**
 * Emit (or, with `check`, verify) a plugin's schema versions.
 *
 * Emit writes each type's current version from its type, and an earlier
 * version only where its file does not exist yet and an archived type is
 * declared for it. Check writes nothing and reports a current version that
 * differs from what its type generates, and any missing version file.
 */
export const emitFormSchemas = async (
  pluginDir: string,
  declaration: FormsDeclaration,
  { check }: { check: boolean }
): Promise<EmitResult> => {
  const result: EmitResult = { written: [], unchanged: [], problems: [] };
  const generate = createSchemaGenerator(
    join(resolve(pluginDir), FORMS_DIR, '**', '*.ts')
  );
  for (const entry of declaration.documentTypes) {
    const dir = typeDir(pluginDir, entry);
    for (const [i, version] of entry.versions.entries()) {
      const file = join(dir, version.file);
      const isCurrent = i === entry.versions.length - 1;
      const exists = existsSync(file);
      if (!isCurrent && exists) continue; // frozen
      if (!version.source || !version.type) {
        result.problems.push(
          `${file}: missing, and it has no archived type to emit it from ` +
            '— an earlier version is frozen, so restore the published file'
        );
        continue;
      }
      if (!isCurrent && check) {
        result.problems.push(
          `${file}: missing — run \`pnpm forms:emit\` to emit it once from ` +
            `${version.source}`
        );
        continue;
      }
      const text = await schemaFileText(
        generate(join(dir, version.source), version.type),
        file
      );
      const before = exists ? readFileSync(file, 'utf8') : undefined;
      if (before === text) {
        result.unchanged.push(file);
      } else if (check) {
        const state = exists
          ? `stale — ${version.type} in ${version.source} generates a ` +
            'different schema'
          : `missing — it is emitted from ${version.type} in ${version.source}`;
        result.problems.push(
          `${file}: ${state}; run \`pnpm forms:emit\` and commit the result`
        );
      } else {
        writeFileSync(file, text);
        result.written.push(file);
      }
    }
  }
  return result;
};

// ── Base document schemas ───────────────────────────────────────────────────

/** The SDK's base document types (src/plugin-sdk/documents.ts). */
export const BASE_DOCUMENT_SOURCE = fileURLToPath(
  new URL('../src/plugin-sdk/documents.ts', import.meta.url)
);

/** Where the host keeps the schemas emitted from them. */
export const BASE_SCHEMA_DIR = fileURLToPath(
  new URL('../src/domain/documentForm/baseSchemas/', import.meta.url)
);

/** One base type per document category that has a host form. */
export const BASE_DOCUMENT_TYPES = [
  'Patient',
  'ProgramEnrolment',
  'Encounter',
  'ContactTrace',
] as const;

/**
 * Emit (or, with `check`, verify) the base document types' schemas into the
 * host. The server reads a document's base fields on its own terms, whatever
 * the registry entry's schema says (an enrolment's date is parsed as RFC
 * 3339), so the host validates every draft against its category's base
 * schema as well (src/domain/documentForm/baseSchemas). Emitted from the same
 * types plugin schemas extend, so the two cannot disagree.
 */
export const emitBaseSchemas = async ({
  check,
}: {
  check: boolean;
}): Promise<EmitResult> => {
  const result: EmitResult = { written: [], unchanged: [], problems: [] };
  const generate = createSchemaGenerator(BASE_DOCUMENT_SOURCE);
  for (const type of BASE_DOCUMENT_TYPES) {
    const file = join(BASE_SCHEMA_DIR, `${type}.json`);
    const text = await schemaFileText(
      generate(BASE_DOCUMENT_SOURCE, type),
      file
    );
    const before = existsSync(file) ? readFileSync(file, 'utf8') : undefined;
    if (before === text) {
      result.unchanged.push(file);
    } else if (check) {
      result.problems.push(
        `${file}: ${before === undefined ? 'missing' : 'stale'} — ${type} in ` +
          'src/plugin-sdk/documents.ts generates a different schema; run ' +
          '`pnpm forms:emit` and commit the result'
      );
    } else {
      writeFileSync(file, text);
      result.written.push(file);
    }
  }
  return result;
};

// ── Pack ────────────────────────────────────────────────────────────────────

const EVENT_RULE_TYPES = new Set(['Field', 'Schedule']);

/*
 * The event rules are the server's own DocumentRegistryConfig format, packed
 * as written; the server deserialises them at install. Checked here only as
 * far as a mistake is certain — every rule an object with a known `type` and
 * an `event` — so that fails the pack instead of the install.
 */
const readEventRules = (path: string, problems: string[]): unknown[] => {
  if (!existsSync(path)) {
    problems.push(`${path}: events file not found`);
    return [];
  }
  const rules = readJson(path);
  if (!Array.isArray(rules)) {
    problems.push(`${path}: must be an array of event rules`);
    return [];
  }
  rules.forEach((rule, i) => {
    if (
      !isRecord(rule) ||
      typeof rule.type !== 'string' ||
      !EVENT_RULE_TYPES.has(rule.type) ||
      !isRecord(rule.event)
    ) {
      problems.push(
        `${path} [${i}]: an event rule is an object with "type" Field or ` +
          'Schedule and an "event"'
      );
    }
  });
  return rules;
};

/**
 * The bundle's `form_plugins` entry for one plugin. Reads every version
 * file and the event rules, and fails naming every missing or malformed
 * file rather than packing a bundle the install would refuse.
 */
export const packFormPlugin = (
  pluginCode: string,
  pluginDir: string,
  declaration: FormsDeclaration
): FormPluginRow => {
  const problems: string[] = [];
  /* eslint-disable camelcase -- the Rust form plugin rows' field names. */
  const documentTypes = declaration.documentTypes.map(
    (entry): FormDocumentTypeRow => {
      const dir = typeDir(pluginDir, entry);
      const versions = entry.versions.flatMap((version, i) => {
        const file = join(dir, version.file);
        if (!existsSync(file)) {
          problems.push(`${file}: schema version file not found`);
          return [];
        }
        const schema = readJson(file);
        if (!isRecord(schema)) {
          problems.push(`${file}: a schema must be a JSON object`);
          return [];
        }
        return [
          {
            id: schemaVersionId(pluginCode, entry.documentType, i + 1, schema),
            json_schema: schema,
          },
        ];
      });
      return {
        document_type: entry.documentType,
        category: entry.category,
        name: entry.name,
        program_key: entry.programKey ?? null,
        versions,
        config: entry.events
          ? { events: readEventRules(join(dir, entry.events), problems) }
          : null,
      };
    }
  );
  if (problems.length > 0) {
    throw new Error(
      `${pluginCode}: cannot pack the form plugin:\n  - ${problems.join('\n  - ')}`
    );
  }
  return {
    plugin_code: pluginCode,
    program_keys: declaration.programKeys,
    document_types: documentTypes,
  };
  /* eslint-enable camelcase */
};
