import { describe, expect, it } from 'vitest';
import type { ColumnDef, Table } from '@tanstack/solid-table';
import { listedColumnIds } from './ColumnSettings';

/*
 * Which columns the Columns popover LISTS — the same answer the toolbar uses
 * to decide whether to offer the popover at all. A table whose every column is
 * structural (`meta.hideFromColumnSettings`) lists none, and the toolbar then
 * drops the control rather than opening a panel with nothing in it.
 */

type Row = { id: string };

const table = (defs: ColumnDef<Row>[]): Table<Row> =>
  ({
    getAllLeafColumns: () =>
      defs.map(columnDef => ({ id: columnDef.id as string, columnDef })),
  }) as unknown as Table<Row>;

describe('listedColumnIds', () => {
  it('drops the structural columns and keeps the rest', () => {
    const defs = [
      { id: 'batch', meta: { hideFromColumnSettings: true } },
      { id: 'comment' },
      { id: 'expiry' },
    ] as ColumnDef<Row>[];
    expect(listedColumnIds(table(defs), 'table')).toEqual([
      'comment',
      'expiry',
    ]);
  });

  it('lists the columns the CURRENT view shows', () => {
    const defs = [
      { id: 'tableOnly', meta: { hideOnCard: true } },
      { id: 'cardOnly', meta: { hideOnTable: true } },
    ] as ColumnDef<Row>[];
    expect(listedColumnIds(table(defs), 'table')).toEqual(['tableOnly']);
    expect(listedColumnIds(table(defs), 'card')).toEqual(['cardOnly']);
  });

  it('lists nothing when every column is structural', () => {
    // The demographics grid: each column carries an input Save still writes,
    // so none may be hidden — and the toolbar offers no Columns control.
    const defs = [
      'name',
      'percentage',
      'currentPopulation',
      'year1',
      'year2',
      'year3',
      'year4',
      'year5',
    ].map(id => ({
      id,
      meta: { hideFromColumnSettings: true },
    })) as ColumnDef<Row>[];
    expect(listedColumnIds(table(defs), 'table')).toEqual([]);
  });
});
