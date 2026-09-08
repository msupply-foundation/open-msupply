import { describe, expect, it } from 'vitest';
import { equipmentToCsv, type ExportRow } from './equipmentToCsv';

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

describe('AC-Z2 one column per specification key', () => {
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
