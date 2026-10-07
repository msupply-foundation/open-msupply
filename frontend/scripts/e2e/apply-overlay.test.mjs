import { describe, expect, it } from 'vitest';
import { applyOverlay, newestTimestamp } from './apply-overlay.mjs';

const row = (table_name, record_id, data) => ({
  cursor: 1,
  record_id,
  table_name,
  action: 'Upsert',
  sync_version: 'V7',
  data: { id: record_id, ...data },
});

const base = {
  site_id: 900,
  sync_buffer_rows: [
    row('reason_option', 'r1', { is_active: true, type: 'Positive' }),
    row('reason_option', 'r2', { is_active: false, type: 'Negative' }),
    row('item', 'i1', { code: 'A', type: 'Stock', default_pack_size: 100 }),
    row('item', 'i2', { code: 'B', type: 'Stock', default_pack_size: 672 }),
    row('item', 'i3', { code: 'S', type: 'Service', default_pack_size: 0 }),
  ],
};
const data = (merged, id) =>
  merged.sync_buffer_rows.find(r => r.record_id === id).data;

describe('applyOverlay', () => {
  it('patches every row of a table, filtered by where and except', () => {
    const merged = applyOverlay(base, {
      patch: [
        { table_name: 'reason_option', set: { is_active: false } },
        {
          table_name: 'item',
          where: { type: 'Stock' },
          except: { code: ['B'] },
          set: { default_pack_size: 1 },
        },
      ],
    });
    expect(data(merged, 'r1').is_active).toBe(false);
    expect(data(merged, 'i1').default_pack_size).toBe(1);
    expect(data(merged, 'i2').default_pack_size).toBe(672); // excepted
    expect(data(merged, 'i3').default_pack_size).toBe(0); // not Stock
  });

  it('leaves the base export untouched', () => {
    applyOverlay(base, {
      patch: [{ table_name: 'reason_option', set: { is_active: false } }],
    });
    expect(base.sync_buffer_rows[0].data.is_active).toBe(true);
  });

  it('fails a patch that matches nothing, rather than silently not varying', () => {
    expect(() =>
      applyOverlay(base, {
        patch: [{ table_name: 'store', set: { store_mode: 'Dispensary' } }],
      })
    ).toThrow(/patch\[0\] \(store\) matched no row/);
  });

  it('replaces a row with the same table and id, and appends a new one shaped like the base', () => {
    const merged = applyOverlay(base, {
      upsert: [
        { table_name: 'item', record_id: 'i1', data: { id: 'i1', code: 'A2' } },
        {
          table_name: 'store',
          record_id: 's9',
          data: { id: 's9', code: 'NEW' },
        },
      ],
    });
    expect(merged.sync_buffer_rows).toHaveLength(6);
    expect(data(merged, 'i1').code).toBe('A2');
    const added = merged.sync_buffer_rows.at(-1);
    expect(added).toMatchObject({
      table_name: 'store',
      action: 'Upsert',
      sync_version: 'V7',
    });
  });
});

describe('relative dates', () => {
  const dated = {
    sync_buffer_rows: [
      row('invoice', 'v1', { created_datetime: '2026-07-06T00:23:14.84' }),
      row('invoice', 'v2', { created_datetime: '2026-05-01T10:00:00' }),
    ],
  };

  it('anchors on the newest timestamp in the base', () => {
    expect(newestTimestamp(dated)).toBe('2026-07-06T00:23:14.84');
  });

  it('resolves @datetime(n) and @date(n) against it, leaving other values alone', () => {
    const merged = applyOverlay(dated, {
      upsert: [
        {
          table_name: 'stocktake',
          record_id: 's1',
          data: {
            id: 's1',
            finalised_datetime: '@datetime(-99)',
            stocktake_date: '@date(-99)',
            comment: '@not-a-date',
          },
        },
      ],
    });
    expect(data(merged, 's1')).toMatchObject({
      finalised_datetime: '2026-03-29T00:23:14',
      stocktake_date: '2026-03-29',
      comment: '@not-a-date',
    });
  });
});
