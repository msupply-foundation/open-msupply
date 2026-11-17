import { readFileSync } from 'node:fs';
import map from 'virtual:legacy-table-config-map';
import type { LegacyTableConfigMap } from 'virtual:legacy-table-config-map';
import { describe, expect, it } from 'vitest';
import { convertTables } from './convertLegacyTableConfig';

// The server migration fragment's fixtures, which its own tests run against
// convert.rs: running them here holds the two conversions to the same rules.
// Relative to frontend/, where vitest runs.
const FIXTURES =
  '../server/repository/src/migrations/v3_04_01/migrate_global_table_configs_to_default_configs/conversion_fixtures.json';

type Fixtures = {
  map: LegacyTableConfigMap;
  cases: {
    name: string;
    old: Record<string, unknown>;
    expected: Record<string, unknown>;
  }[];
};

const fixtures = JSON.parse(readFileSync(FIXTURES, 'utf8')) as Fixtures;

describe('convertTables', () => {
  it('has fixtures to run', () => {
    expect(fixtures.cases.length).toBeGreaterThan(0);
  });

  it.each(fixtures.cases.map(c => [c.name, c] as const))('%s', (_, c) => {
    expect(convertTables(c.old, fixtures.map)).toEqual(c.expected);
  });

  it('converts through the real map', () => {
    expect(
      convertTables(
        {
          'stock-movement-detail': {
            columnOrder: ['stockLine.item.code', 'mrt-row-select'],
            columnSizing: { 'stockLine.item.code': 200 },
            grouping: ['stockLine.item.code'],
          },
        },
        map
      )
    ).toEqual({
      'stock-movement-lines': {
        columnOrder: ['itemCode'],
        columnSizing: { itemCode: 12.5 },
        groupRows: true,
      },
    });
  });
});
