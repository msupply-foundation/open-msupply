import { describe, expect, it } from 'vitest';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';
import { deleteEach } from '@/domain/selection';
import {
  compareVersions,
  rowKey,
  rowsForKeys,
  runtimeText,
  orderPlugins,
  typesText,
  uninstallOrder,
  uninstallOutcome,
  type PluginRow,
} from './pluginRows';

// The refusal copy is asserted, so the real dictionary is seeded.
setDictionaries({ en: commonEn });
setLocale('en');

// spec/plugin-management/cases/OMS-REG-MNG-07 — the list

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

describe('OMS-REG-MNG-07.10 — a backend and a frontend half of one code both show', () => {
  it('reads the backend kind with a blank runtime, the frontend with its own', () => {
    const [backend, , frontend] = serverOrder;
    expect(kindLabel(backend!.kind)).toBe('Backend');
    expect(runtimeText(backend!)).toBe('');
    expect(kindLabel(frontend!.kind)).toBe('Frontend');
    expect(runtimeText(frontend!)).toBe('react');
  });
});

describe('OMS-REG-MNG-07.11 — two runtimes of one code and version stay two rows', () => {
  it('keys them apart', () => {
    const react = row({ id: 'fe_react', hostRuntime: 'react' });
    const solid = row({ id: 'fe_solid', hostRuntime: 'solid' });
    expect(rowKey(react)).not.toBe(rowKey(solid));
  });
});

describe('OMS-REG-MNG-07.12 — with no sort the server order stands', () => {
  it('keeps every backend row first, then frontend, each by id', () => {
    expect(ids(orderPlugins(serverOrder, undefined, kindLabel))).toEqual(
      ids(serverOrder)
    );
  });

  it('keeps it for a sort key the list does not know (a hand-edited address)', () => {
    expect(
      ids(orderPlugins(serverOrder, { key: 'bogus', desc: false }, kindLabel))
    ).toEqual(ids(serverOrder));
  });
});

describe('OMS-REG-MNG-07.13 — versions sort part by part as numbers', () => {
  it('puts 2.9.0 before 2.10.0', () => {
    expect(compareVersions('2.9.0', '2.10.0')).toBeLessThan(0);
    const sorted = orderPlugins(
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

  it('still orders an unreadable version, as text (OMS-REG-MNG-07.40)', () => {
    expect(() => compareVersions('abc', '1.0.0')).not.toThrow();
  });
});

describe('OMS-REG-MNG-07.15 — code, kind and runtime sort either way', () => {
  it('sorts by code ascending, then descending', () => {
    expect(
      codes(orderPlugins(serverOrder, { key: 'code', desc: false }, kindLabel))
    ).toEqual([
      'afghanistan_plugins',
      'civ_plugins',
      'civ_plugins',
      'hello',
      'hello',
    ]);
    expect(
      codes(
        orderPlugins(serverOrder, { key: 'code', desc: true }, kindLabel)
      )[0]
    ).toBe('hello');
  });

  it('sorts by the kind as shown', () => {
    const asc = orderPlugins(
      serverOrder,
      { key: 'kind', desc: false },
      kindLabel
    );
    expect(asc[0]!.kind).toBe('BACKEND');
    const desc = orderPlugins(
      serverOrder,
      { key: 'kind', desc: true },
      kindLabel
    );
    expect(desc.at(-1)!.kind).toBe('BACKEND');
  });

  it('sorts by runtime, the blank backend runtime first ascending', () => {
    const asc = orderPlugins(
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
    const desc = orderPlugins(
      serverOrder,
      { key: 'runtime', desc: true },
      kindLabel
    );
    expect(runtimeText(desc[0]!)).toBe('solid');
  });

  it('keeps ties in the server order (a stable sort)', () => {
    const asc = orderPlugins(
      serverOrder,
      { key: 'code', desc: false },
      kindLabel
    );
    expect(ids(asc.filter(r => r.code === 'civ_plugins'))).toEqual([
      'backend_civ',
      'frontend_civ',
    ]);
  });
});

describe('OMS-REG-MNG-07.16 — types read comma-separated in the declared order', () => {
  it('joins them', () => {
    expect(typesText(serverOrder[0]!)).toBe(
      'average_monthly_consumption, graphql_query'
    );
  });
});

describe('OMS-REG-MNG-07.20 — a backend and a frontend plugin under one id select apart', () => {
  it('keys a row on kind and id', () => {
    const backend = row({ id: 'shared', kind: 'BACKEND', hostRuntime: null });
    const frontend = row({ id: 'shared', kind: 'FRONTEND' });
    expect(rowKey(backend)).not.toBe(rowKey(frontend));
    expect(rowsForKeys([backend, frontend], [rowKey(frontend)])).toEqual([
      frontend,
    ]);
  });
});

describe('OMS-REG-MNG-07.65 — uninstalling a frontend row whose id a backend row shares', () => {
  const removed = (kind: PluginRow['kind']) =>
    ({
      kind: 'success',
      data: {
        centralServer: {
          plugins: { uninstallPlugin: { id: 'shared', code: 'x', kind } },
        },
      },
    }) as const;

  it('is a refusal naming what the server removed instead', () => {
    expect(uninstallOutcome({ kind: 'FRONTEND' }, removed('BACKEND'))).toEqual({
      kind: 'refused',
      reason:
        'The backend plugin with the same id was uninstalled instead. This plugin is still installed.',
    });
  });

  it('is a plain success when the server removed the row selected', () => {
    expect(uninstallOutcome({ kind: 'FRONTEND' }, removed('FRONTEND'))).toEqual(
      { kind: 'done' }
    );
    expect(uninstallOutcome({ kind: 'BACKEND' }, removed('BACKEND'))).toEqual({
      kind: 'done',
    });
  });
});

describe('OMS-REG-MNG-07.66 — both rows of a shared id selected, in any list order', () => {
  // The server, as the contract has it: one row per kind, and an uninstall by
  // id removes the backend row first (contract › uninstalling plugins).
  const server = () => {
    const held = new Set<PluginRow['kind']>(['BACKEND', 'FRONTEND']);
    const uninstall = (row: Pick<PluginRow, 'kind'>) => {
      const removed = held.has('BACKEND') ? 'BACKEND' : 'FRONTEND';
      held.delete(removed);
      return uninstallOutcome(row, {
        kind: 'success',
        data: {
          centralServer: {
            plugins: {
              uninstallPlugin: { id: 'shared', code: 'x', kind: removed },
            },
          },
        },
      });
    };
    return { held, uninstall };
  };
  const backend = { kind: 'BACKEND' as const, name: 'backend' };
  const frontend = { kind: 'FRONTEND' as const, name: 'frontend' };

  it('puts backend rows first, keeping each kind in list order', () => {
    expect(uninstallOrder([frontend, backend]).map(r => r.name)).toEqual([
      'backend',
      'frontend',
    ]);
  });

  it('uninstalls both, and neither reads as refused, when the frontend row is listed first', async () => {
    const { held, uninstall } = server();
    const summary = await deleteEach(
      uninstallOrder([frontend, backend]),
      async row => uninstall(row),
      1
    );
    expect(summary.deleted.map(r => r.name)).toEqual(['backend', 'frontend']);
    expect(summary.refused).toEqual([]);
    expect(held.size).toBe(0);
  });

  it('(without the order, both would read as refused though both are gone)', async () => {
    const { held, uninstall } = server();
    const summary = await deleteEach(
      [frontend, backend],
      async row => uninstall(row),
      1
    );
    expect(summary.refused.map(r => r.record.name)).toEqual([
      'frontend',
      'backend',
    ]);
    expect(held.size).toBe(0);
  });
});
