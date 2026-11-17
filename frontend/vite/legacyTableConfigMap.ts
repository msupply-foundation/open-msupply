import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/*
 * Serves the legacy table config map to the front end as the virtual module
 * `virtual:legacy-table-config-map` (issue #2072).
 *
 * The map says how each React front end (`client/`) table and column id maps
 * to this UI's, and is part of the server migration fragment that converts the
 * shared table layouts. The front end's one-time import of personal layouts
 * must apply the same mapping, so it reads the same file rather than a copy.
 * The plugin reads it from disk and emits it as a plain object
 * (`export default {…}`), so no JSON reaches the bundle and nothing is written
 * into `frontend/`. Its type is declared in
 * src/legacyTableImport/virtualModules.d.ts, and the shape is checked here on
 * every load, so a malformed map fails the build rather than the import.
 *
 * The file sits outside `frontend/`, so the Dockerfile's front-end stage
 * copies it in at the same relative path. If a later migration fragment ships
 * a corrected map, MAP_PATH points at that one.
 */

export const LEGACY_TABLE_CONFIG_MAP_MODULE_ID =
  'virtual:legacy-table-config-map';
const RESOLVED_ID = `\0${LEGACY_TABLE_CONFIG_MAP_MODULE_ID}`;

const MAP_PATH = fileURLToPath(
  new URL(
    '../../server/repository/src/migrations/v3_04_01/migrate_global_table_configs_to_default_configs/legacy_table_config_map.json',
    import.meta.url
  )
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const unexpectedKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  at: string
): string[] =>
  Object.keys(value)
    .filter(key => !allowed.includes(key))
    .map(key => `${at}: unexpected key "${key}"`);

/**
 * Every way `map` differs from the shape the front end's type declares, as one
 * message per problem; empty when it matches. A `from` id listed twice is a
 * problem too, since only one entry could apply. Two entries with the same
 * `to` are allowed: the earlier one wins.
 */
export const legacyTableConfigMapProblems = (map: unknown): string[] => {
  if (!isRecord(map)) return ['the map is not an object'];
  const problems = unexpectedKeys(map, ['version', 'tables'], 'map');
  if (
    typeof map.version !== 'number' ||
    !Number.isInteger(map.version) ||
    map.version < 1
  ) {
    problems.push('version: must be a whole number of 1 or more');
  }
  if (!Array.isArray(map.tables)) {
    problems.push('tables: must be an array');
    return problems;
  }
  const seenFrom = new Set<string>();
  map.tables.forEach((table: unknown, index) => {
    const at = `tables[${index}]`;
    if (!isRecord(table)) {
      problems.push(`${at}: must be an object`);
      return;
    }
    problems.push(
      ...unexpectedKeys(table, ['from', 'to', 'columns', 'groupRows'], at)
    );
    for (const key of ['from', 'to'] as const) {
      if (typeof table[key] !== 'string' || table[key] === '') {
        problems.push(`${at}.${key}: must be a non-empty string`);
      }
    }
    if (typeof table.from === 'string') {
      if (seenFrom.has(table.from)) {
        problems.push(`${at}.from: "${table.from}" is already mapped`);
      }
      seenFrom.add(table.from);
    }
    if (!isRecord(table.columns)) {
      problems.push(`${at}.columns: must be an object`);
    } else {
      for (const [column, target] of Object.entries(table.columns)) {
        if (target !== null && (typeof target !== 'string' || target === '')) {
          problems.push(
            `${at}.columns.${column}: must be a non-empty string or null`
          );
        }
      }
    }
    if ('groupRows' in table && typeof table.groupRows !== 'boolean') {
      problems.push(`${at}.groupRows: must be true or false when present`);
    }
  });
  return problems;
};

/** The virtual module's source for a map that has passed the shape check. */
export const renderLegacyTableConfigMapModule = (map: unknown): string =>
  `export default ${JSON.stringify(map)};\n`;

export const legacyTableConfigMapPlugin = (mapPath = MAP_PATH): Plugin => ({
  name: 'oms-legacy-table-config-map',

  resolveId(id) {
    return id === LEGACY_TABLE_CONFIG_MAP_MODULE_ID ? RESOLVED_ID : undefined;
  },

  load(id) {
    if (id !== RESOLVED_ID) return undefined;
    this.addWatchFile(mapPath);
    let map: unknown;
    try {
      map = JSON.parse(readFileSync(mapPath, 'utf8'));
    } catch (error) {
      this.error(
        `[legacy-table-config-map] couldn't read ${mapPath}: ${String(error)}`
      );
    }
    const problems = legacyTableConfigMapProblems(map);
    if (problems.length > 0) {
      this.error(
        `[legacy-table-config-map] ${mapPath} doesn't match the expected shape:\n  ${problems.join('\n  ')}`
      );
    }
    return renderLegacyTableConfigMapModule(map);
  },
});
