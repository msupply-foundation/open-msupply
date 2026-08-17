import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dateTimeText, siteColumns } from './siteColumns';

// Anchors: spec/sites/cases/OMS-FUN-SYC-002 (behaviours cited per describe).

// The shared cell presets size columns in rem and convert to px against the
// document's root font size, so building a column set touches the DOM. The
// `node` vitest project has none (by design — see vitest.workspace.ts), so the
// two reads are stubbed at their default: 16px per rem. Nothing under test cares
// about the number; the column IDENTITIES and sort keys are what the spec fixes.
beforeEach(() => {
  vi.stubGlobal('document', { documentElement: {} });
  vi.stubGlobal('getComputedStyle', () => ({ fontSize: '16px' }));
});

const columnIds = () => siteColumns().map(column => column.c.key);

describe('OMS-FUN-SYC-002.6 — the register lists Code, Name, Hardware ID, Sync Version, Version, Last Connection and Last Sync', () => {
  it('is exactly those seven columns, in that order', () => {
    expect(columnIds()).toEqual([
      'code',
      'name',
      'hardwareId',
      'syncVersion',
      'appVersion',
      'lastConnectionDatetime',
      'lastSyncDatetime',
    ]);
  });

  it('has NO id, multi-device or application-name column, though the read carries the last', () => {
    expect(columnIds()).not.toContain('id');
    expect(columnIds()).not.toContain('isMultiDevice');
    expect(columnIds()).not.toContain('appName');
  });
});

describe('OMS-FUN-SYC-002.8 — Code and Name sort in both directions; no other column offers a sort', () => {
  it('gives a sortKey to exactly Code and Name', () => {
    const sortable = siteColumns()
      .filter(column => column.sortKey !== undefined)
      .map(column => column.sortKey);
    expect(sortable).toEqual(['code', 'name']);
  });

  it('never names the declared-but-broken `id` sort key', () => {
    // Sorting by it fails the whole read (COLLATE NOCASE against an integer
    // column — contract.md wire trap), and SiteSortKey types it out.
    expect(siteColumns().some(column => String(column.sortKey) === 'id')).toBe(
      false
    );
  });
});

describe('the timestamp columns (ui-surface S1 § columns — "date & time", blank when absent)', () => {
  it('renders blank rather than a placeholder for a never-paired site', () => {
    // tables § absent values: a dash reads as data.
    expect(dateTimeText(null)).toBe('');
  });

  it('renders a real value through the shared localised date-and-time formatter', () => {
    // Server-local wall clock (NaiveDateTime, no offset), so the text carries
    // both halves of the instant the register reports.
    const rendered = dateTimeText('2026-08-06T05:13:46');
    expect(rendered).not.toBe('');
    expect(rendered).toMatch(/\d/);
  });
});
