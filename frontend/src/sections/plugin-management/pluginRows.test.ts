import { describe, expect, it } from 'vitest';
import {
  compareVersions,
  rowKey,
  rowsForKeys,
  runtimeText,
  sortRows,
  typesText,
  type PluginRow,
} from './pluginRows';

// spec/plugin-management/acceptance.md › the list

const row = (overrides: Partial<PluginRow>): PluginRow => ({
  id: 'frontend_x',
  code: 'x',
  version: '1.0.0',
  kind: 'FRONTEND',
  types: ['pages'],
  hostRuntime: 'solid',
  ...overrides,
});

const kindLabel = (kind: PluginRow['kind']) =>
  kind === 'BACKEND' ? 'Backend' : 'Frontend';

// The server's own order: every backend row, then every frontend row, each by
// id (contract › reading the installed plugins).
const serverOrder: PluginRow[] = [
  row({
    id: 'backend_civ',
    code: 'civ_plugins',
    kind: 'BACKEND',
    hostRuntime: null,
    version: '1.0.3',
    types: ['average_monthly_consumption', 'graphql_query'],
  }),
  row({
    id: 'frontend_afg',
    code: 'afghanistan_plugins',
    version: '2.20.17',
    hostRuntime: 'react',
  }),
  row({
    id: 'frontend_civ',
    code: 'civ_plugins',
    version: '1.0.1',
    hostRuntime: 'react',
  }),
  row({
    id: 'frontend_hello_react',
    code: 'hello',
    version: '2.10.0',
    hostRuntime: 'react',
  }),
  row({
    id: 'frontend_hello_solid',
    code: 'hello',
    version: '2.9.0',
    hostRuntime: 'solid',
  }),
];

const codes = (rows: PluginRow[]) => rows.map(r => r.code);
const ids = (rows: PluginRow[]) => rows.map(r => r.id);

describe('AC-L2 — a backend and a frontend half of one code both show', () => {
  it('reads the backend kind with a blank runtime, the frontend with its own', () => {
    const [backend, , frontend] = serverOrder;
    expect(kindLabel(backend!.kind)).toBe('Backend');
    expect(runtimeText(backend!)).toBe('');
    expect(kindLabel(frontend!.kind)).toBe('Frontend');
    expect(runtimeText(frontend!)).toBe('react');
  });
});

describe('AC-L3 — two runtimes of one code and version stay two rows', () => {
  it('keys them apart', () => {
    const react = row({ id: 'fe_react', hostRuntime: 'react' });
    const solid = row({ id: 'fe_solid', hostRuntime: 'solid' });
    expect(rowKey(react)).not.toBe(rowKey(solid));
  });
});

describe('AC-L4 — with no sort the server order stands', () => {
  it('keeps every backend row first, then frontend, each by id', () => {
    expect(ids(sortRows(serverOrder, undefined, kindLabel))).toEqual(
      ids(serverOrder)
    );
  });
});

describe('AC-L5 — versions sort part by part as numbers', () => {
  it('puts 2.9.0 before 2.10.0', () => {
    expect(compareVersions('2.9.0', '2.10.0')).toBeLessThan(0);
    const sorted = sortRows(
      serverOrder,
      { key: 'version', desc: false },
      kindLabel
    );
    expect(sorted.map(r => r.version)).toEqual([
      '1.0.1',
      '1.0.3',
      '2.9.0',
      '2.10.0',
      '2.20.17',
    ]);
  });

  it('still orders an unreadable version, as text (AC-I17)', () => {
    expect(() => compareVersions('abc', '1.0.0')).not.toThrow();
  });
});

describe('AC-L6 — code, kind and runtime sort either way', () => {
  it('sorts by code ascending, then descending', () => {
    expect(
      codes(sortRows(serverOrder, { key: 'code', desc: false }, kindLabel))
    ).toEqual([
      'afghanistan_plugins',
      'civ_plugins',
      'civ_plugins',
      'hello',
      'hello',
    ]);
    expect(
      codes(sortRows(serverOrder, { key: 'code', desc: true }, kindLabel))[0]
    ).toBe('hello');
  });

  it('sorts by the kind as shown', () => {
    const asc = sortRows(serverOrder, { key: 'kind', desc: false }, kindLabel);
    expect(asc[0]!.kind).toBe('BACKEND');
    const desc = sortRows(serverOrder, { key: 'kind', desc: true }, kindLabel);
    expect(desc.at(-1)!.kind).toBe('BACKEND');
  });

  it('sorts by runtime, the blank backend runtime first ascending', () => {
    const asc = sortRows(
      serverOrder,
      { key: 'runtime', desc: false },
      kindLabel
    );
    expect(asc.map(runtimeText)).toEqual([
      '',
      'react',
      'react',
      'react',
      'solid',
    ]);
    const desc = sortRows(
      serverOrder,
      { key: 'runtime', desc: true },
      kindLabel
    );
    expect(runtimeText(desc[0]!)).toBe('solid');
  });

  it('keeps ties in the server order (a stable sort)', () => {
    const asc = sortRows(serverOrder, { key: 'code', desc: false }, kindLabel);
    expect(ids(asc.filter(r => r.code === 'civ_plugins'))).toEqual([
      'backend_civ',
      'frontend_civ',
    ]);
  });
});

describe('AC-L7 — types read comma-separated in the declared order', () => {
  it('joins them', () => {
    expect(typesText(serverOrder[0]!)).toBe(
      'average_monthly_consumption, graphql_query'
    );
  });
});

describe('AC-L10 — a backend and a frontend plugin under one id select apart', () => {
  it('keys a row on kind and id', () => {
    const backend = row({ id: 'shared', kind: 'BACKEND', hostRuntime: null });
    const frontend = row({ id: 'shared', kind: 'FRONTEND' });
    expect(rowKey(backend)).not.toBe(rowKey(frontend));
    expect(rowsForKeys([backend, frontend], [rowKey(frontend)])).toEqual([
      frontend,
    ]);
  });
});
