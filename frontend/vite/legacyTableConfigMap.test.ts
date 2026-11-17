import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  LEGACY_TABLE_CONFIG_MAP_MODULE_ID,
  legacyTableConfigMapPlugin,
  legacyTableConfigMapProblems,
} from './legacyTableConfigMap.ts';

const validMap = {
  version: 1,
  tables: [
    {
      from: 'inbound-shipment-detail-view',
      to: 'inbound-shipment-detail',
      columns: { itemCode: 'item-code', 'mrt-row-select': null },
      groupRows: true,
    },
    { from: 'stock-list', to: 'stock-list', columns: {} },
  ],
};

describe('legacyTableConfigMapProblems', () => {
  it('accepts a well-formed map', () => {
    expect(legacyTableConfigMapProblems(validMap)).toEqual([]);
  });

  it('accepts a map with no tables', () => {
    expect(legacyTableConfigMapProblems({ version: 1, tables: [] })).toEqual(
      []
    );
  });

  it('accepts column prefix rewrites', () => {
    const map = {
      version: 1,
      columnPrefixes: { 'prop-': 'cf-' },
      tables: [],
    };
    expect(legacyTableConfigMapProblems(map)).toEqual([]);
  });

  it('accepts one old table mapped to several new tables', () => {
    const map = {
      version: 1,
      tables: [
        { from: 'name-list', to: 'names-customers', columns: {} },
        { from: 'name-list', to: 'names-suppliers', columns: {} },
      ],
    };
    expect(legacyTableConfigMapProblems(map)).toEqual([]);
  });

  it('accepts two entries mapping to the same new table', () => {
    const map = {
      version: 1,
      tables: [
        { from: 'a', to: 'shared', columns: {} },
        { from: 'b', to: 'shared', columns: {} },
      ],
    };
    expect(legacyTableConfigMapProblems(map)).toEqual([]);
  });

  it.each([
    ['not an object', [], 'the map is not an object'],
    ['a missing version', { tables: [] }, 'version: must be'],
    ['a version of 0', { version: 0, tables: [] }, 'version: must be'],
    ['a fractional version', { version: 1.5, tables: [] }, 'version: must be'],
    ['tables as an object', { version: 1, tables: {} }, 'tables: must be'],
    [
      'columnPrefixes as an array',
      { version: 1, columnPrefixes: [], tables: [] },
      'columnPrefixes: must be an object',
    ],
    [
      'an empty prefix',
      { version: 1, columnPrefixes: { '': 'cf-' }, tables: [] },
      'columnPrefixes.: must map',
    ],
    [
      'a prefix mapped to null',
      { version: 1, columnPrefixes: { 'prop-': null }, tables: [] },
      'columnPrefixes.prop-: must map',
    ],
    [
      'an unexpected top-level key',
      { version: 1, tables: [], extra: true },
      'map: unexpected key "extra"',
    ],
  ])('rejects %s', (_, map, message) => {
    expect(legacyTableConfigMapProblems(map).join('\n')).toContain(message);
  });

  it.each([
    ['a missing from', { to: 'b', columns: {} }, 'tables[0].from'],
    ['an empty to', { from: 'a', to: '', columns: {} }, 'tables[0].to'],
    ['missing columns', { from: 'a', to: 'b' }, 'tables[0].columns'],
    [
      'a column mapped to a number',
      { from: 'a', to: 'b', columns: { x: 1 } },
      'tables[0].columns.x',
    ],
    [
      'a column mapped to an empty string',
      { from: 'a', to: 'b', columns: { x: '' } },
      'tables[0].columns.x',
    ],
    [
      'a non-boolean groupRows',
      { from: 'a', to: 'b', columns: {}, groupRows: 'yes' },
      'tables[0].groupRows',
    ],
    [
      'an unexpected table key',
      { from: 'a', to: 'b', columns: {}, colums: {} },
      'tables[0]: unexpected key "colums"',
    ],
  ])('rejects a table with %s', (_, table, message) => {
    const problems = legacyTableConfigMapProblems({
      version: 1,
      tables: [table],
    });
    expect(problems.join('\n')).toContain(message);
  });

  it('rejects the same old → new pair twice', () => {
    const map = {
      version: 1,
      tables: [
        { from: 'a', to: 'b', columns: {} },
        { from: 'a', to: 'b', columns: { x: 'y' } },
      ],
    };
    expect(legacyTableConfigMapProblems(map)).toEqual([
      'tables[1]: "a" → "b" is already mapped',
    ]);
  });
});

describe('legacyTableConfigMapPlugin', () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  const writeMap = (contents: string): string => {
    dir = mkdtempSync(join(tmpdir(), 'legacy-table-config-map-'));
    const path = join(dir, 'map.json');
    writeFileSync(path, contents);
    return path;
  };

  // Runs the plugin's resolveId and load hooks the way Vite does, with a
  // context whose error() throws as Rollup's does.
  const loadVirtualModule = (mapPath: string) => {
    const plugin = legacyTableConfigMapPlugin(mapPath);
    const watched: string[] = [];
    const context = {
      addWatchFile: (path: string) => watched.push(path),
      error: (message: string) => {
        throw new Error(message);
      },
    };
    // The plugin defines both hooks as plain functions, not { handler }.
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    const load = plugin.load as unknown as (
      this: typeof context,
      id: string
    ) => string;
    const resolved = resolveId(LEGACY_TABLE_CONFIG_MAP_MODULE_ID);
    if (!resolved) throw new Error('virtual module id did not resolve');
    return { code: load.call(context, resolved), watched };
  };

  it('ignores other module ids', () => {
    const plugin = legacyTableConfigMapPlugin(writeMap('{}'));
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId('virtual:something-else')).toBeUndefined();
  });

  it('serves the map as a default-exported object and watches the file', async () => {
    const path = writeMap(JSON.stringify(validMap));
    const { code, watched } = loadVirtualModule(path);
    expect(watched).toEqual([path]);
    const url = `data:text/javascript,${encodeURIComponent(code)}`;
    const module = (await import(/* @vite-ignore */ url)) as {
      default: unknown;
    };
    expect(module.default).toEqual(validMap);
  });

  it('fails on a file that is not JSON', () => {
    const path = writeMap('{ version: 1 ');
    expect(() => loadVirtualModule(path)).toThrow(/couldn't read/);
  });

  it('fails on a missing file', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'legacy-table-config-map-'));
    dir = emptyDir;
    expect(() => loadVirtualModule(join(emptyDir, 'missing.json'))).toThrow(
      /couldn't read/
    );
  });

  it('fails on a map with the wrong shape, listing each problem', () => {
    const path = writeMap(JSON.stringify({ version: 0, tables: [{}] }));
    expect(() => loadVirtualModule(path)).toThrow(
      /version: must be[\s\S]*tables\[0\]\.from/
    );
  });
});
