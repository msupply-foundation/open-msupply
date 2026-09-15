import { describe, expect, it } from 'vitest';
import { equipmentToCsv, type ExportRow } from './equipmentToCsv';
import { format } from 'date-fns';
import { es, fr, ru } from 'date-fns/locale';
import {
  parseImportDate,
  parseNeedsReplacement,
} from '../import/importParse';
import { t } from '@/intl';

const row = (over: Partial<ExportRow> = {}): ExportRow =>
  ({
    __typename: 'AssetNode',
    id: 'asset-1',
    storeId: 'store-a',
    assetNumber: 'CCE-0001',
    serialNumber: 'SN-1',
    notes: 'a note',
    installationDate: '2024-03-01',
    replacementDate: null,
    catalogueItemId: 'cat-1',
    catalogueItem: { code: 'E003/059' },
    assetCategory: null,
    assetType: null,
    statusLog: { status: 'FUNCTIONING', logDatetime: '2024-03-01T00:00:00Z' },
    store: { id: 'store-a', code: 'LIQ', storeName: 'Liquica' },
    warrantyStart: null,
    warrantyEnd: null,
    needsReplacement: true,
    createdDatetime: '2024-01-01T00:00:00Z',
    modifiedDatetime: '2024-02-01T00:00:00Z',
    properties: '{"climate_zone":"Cold","site_notes":"by the door"}',
    catalogProperties: '{"climate_zone":"Hot"}',
    ...over,
  }) as unknown as ExportRow;

// In node vitest no dictionary is loaded, so `t()` answers with the key
// itself — which makes these assertions sharper than they would be against
// English text: they prove the CATALOG KEY each column carries.
const header = (csv: string) => csv.split('\r\n')[0] ?? '';
const firstRow = (csv: string) => csv.split('\r\n')[1] ?? '';

describe('OMS-REG-CCE-07.14 — one column per specification key', () => {
  it('appends a column per key, de-duplicated', () => {
    // The property catalogue returns one row per scope, so the same key recurs.
    const csv = equipmentToCsv(
      [row()],
      ['climate_zone', 'climate_zone', 'site_notes'],
      false
    );
    const columns = header(csv).split(',');
    expect(columns.filter(c => c.includes('climate_zone'))).toHaveLength(1);
    expect(columns.filter(c => c.includes('site_notes'))).toHaveLength(1);
  });

  it('shows the catalogue’s value where both answer a key', () => {
    const csv = equipmentToCsv([row()], ['climate_zone'], false);
    expect(firstRow(csv)).toContain('Hot');
    expect(firstRow(csv)).not.toContain('Cold');
  });

  it('shows the asset’s own value where the catalogue does not answer', () => {
    const csv = equipmentToCsv([row()], ['site_notes'], false);
    expect(firstRow(csv)).toContain('by the door');
  });

  it('leaves a key neither side answers empty', () => {
    const csv = equipmentToCsv([row()], ['energy_source'], false);
    expect(firstRow(csv)).toMatch(/,\s*$|,$/);
  });
});

describe('the store column leads on a central server only', () => {
  it('carries the store’s code on a central server', () => {
    const csv = equipmentToCsv([row()], [], true);
    expect(header(csv).split(',')[1]).toBe('label.store');
    expect(firstRow(csv).split(',')[1]).toBe('LIQ');
  });

  it('omits it elsewhere', () => {
    const csv = equipmentToCsv([row()], [], false);
    expect(header(csv)).not.toContain('label.store');
  });
});

describe('the fixed columns', () => {
  it('leads with the identifier, then the identity', () => {
    const columns = header(equipmentToCsv([row()], [], false)).split(',');
    expect(columns[0]).toBe('id');
    expect(columns[1]).toBe('label.asset-number');
    expect(columns[2]).toBe('label.catalogue-item-code');
  });

  it('writes the status by its catalog label, not the wire value', () => {
    const csv = equipmentToCsv([row()], [], false);
    expect(firstRow(csv)).not.toContain('FUNCTIONING');
  });

  it('leaves the status blank for an asset with no status entry', () => {
    const csv = equipmentToCsv([row({ statusLog: null })], [], false);
    expect(firstRow(csv)).not.toContain('FUNCTIONING');
  });

  it('leaves an absent date blank rather than printing a placeholder', () => {
    const csv = equipmentToCsv([row({ replacementDate: null })], [], false);
    expect(firstRow(csv)).not.toContain('Invalid');
  });
});


/*
 * The export and the import are two halves of one round trip, and they drifted:
 * the export writes dates in the READER's locale and the flag as a word, while
 * the import read one date notation and one spelling of the flag. A user who
 * exported a register and fed it back got dates dropped as warnings and the
 * replacement flag silently cleared.
 *
 * `exportDate` is date-fns `P`, so these are the shapes it actually produces —
 * pinned here rather than in the import's own tests, because it is the PAIRING
 * that has to hold, and only this file knows what the export writes.
 */
describe('what the export writes, the import reads back', () => {
  const day = new Date(2026, 8, 14); // 14 September 2026

  it('every locale’s short date', () => {
    for (const locale of [es, fr, ru]) {
      const written = format(day, 'P', { locale });
      expect(
        parseImportDate(written),
        `the import must read "${written}"`
      ).toBe('2026-09-14');
    }
  });

  it('the replacement flag, as the word the export writes', () => {
    expect(parseNeedsReplacement(t('messages.yes'))).toBe(true);
    expect(parseNeedsReplacement(t('messages.no'))).toBe(false);
  });
});
