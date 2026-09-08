/* eslint-disable camelcase -- The specification's property KEYS are the
   server's own, and snake_case: `climate_zone`, `initial_mapping_date`. They
   are data, not identifiers this app chooses, so the fixtures below spell them
   exactly as the catalogue serves them. */
import { describe, expect, it } from 'vitest';
import type { AssetDetail } from './assetEdit';
import {
  buildUpdateInput,
  canEditLocations,
  formFromAsset,
  isLockedField,
  isUnchanged,
  parseProperties,
} from './assetEdit';

const STORE = 'store-a';

const asset = (over: Partial<AssetDetail> = {}): AssetDetail =>
  ({
    __typename: 'AssetNode',
    id: 'asset-1',
    storeId: STORE,
    assetNumber: 'CCE-0001',
    serialNumber: 'SN-1',
    notes: 'a note',
    catalogueItemId: 'cat-1',
    installationDate: '2024-03-01',
    replacementDate: '2030-03-01',
    warrantyStart: null,
    warrantyEnd: null,
    needsReplacement: true,
    donorNameId: null,
    createdDatetime: '2024-01-01T00:00:00Z',
    modifiedDatetime: '2024-01-01T00:00:00Z',
    properties: '{"climate_zone":"Hot"}',
    catalogProperties: '{"storage_capacity_5c":88}',
    catalogueItem: null,
    assetClass: null,
    assetCategory: null,
    assetType: null,
    statusLog: null,
    store: null,
    donor: null,
    locations: { totalCount: 1, nodes: [{ id: 'loc-1' }] },
    documents: { nodes: [] },
    lockedFields: {
      serialNumber: false,
      catalogueItemId: false,
      warrantyStart: false,
      warrantyEnd: false,
    },
    ...over,
  }) as unknown as AssetDetail;

describe('the specification is a JSON string, not a structured field', () => {
  it('parses the asset-own object', () => {
    expect(parseProperties('{"a":1}')).toEqual({ a: 1 });
  });

  it('reads the fabricated "{}" as no specification', () => {
    // The server never returns null here — it fabricates the two-character
    // string (contract ⚠️ wire trap).
    expect(parseProperties('{}')).toEqual({});
  });

  it('treats a malformed value as no specification rather than crashing', () => {
    expect(parseProperties('not json')).toEqual({});
    expect(parseProperties('[1,2]')).toEqual({});
    expect(parseProperties(null)).toEqual({});
  });
});

describe('AC-E6 / AC-E7 a save writes the WHOLE draft', () => {
  const form = formFromAsset(asset(), STORE, false);

  it('always sends the four non-partial fields, even unchanged', () => {
    // Omitting any of them ERASES it (contract ⚠️ wire trap). There is no
    // shape that leaves them alone.
    const input = buildUpdateInput(form, 'asset-1');
    expect(input).toHaveProperty('assetNumber', 'CCE-0001');
    expect(input).toHaveProperty('notes', 'a note');
    expect(input).toHaveProperty('properties', '{"climate_zone":"Hot"}');
    expect(input).toHaveProperty('needsReplacement', true);
  });

  it('preserves the other three when only one is edited', () => {
    const input = buildUpdateInput({ ...form, notes: 'edited' }, 'asset-1');
    expect(input.notes).toBe('edited');
    expect(input.assetNumber).toBe('CCE-0001');
    expect(input.properties).toBe('{"climate_zone":"Hot"}');
    expect(input.needsReplacement).toBe(true);
  });

  it('sends the asset-own specification, never the catalogue’s', () => {
    // Writing the catalogue's values onto the asset would freeze a snapshot of
    // the model (contract › editing an asset).
    const input = buildUpdateInput(form, 'asset-1');
    expect(input.properties).not.toContain('storage_capacity_5c');
  });

  it('clears a field the user emptied rather than omitting it', () => {
    const input = buildUpdateInput({ ...form, assetNumber: '' }, 'asset-1');
    expect(input).toHaveProperty('assetNumber', null);
  });
});

describe('the nullable-update fields carry the three-state wrapper', () => {
  const form = formFromAsset(asset(), STORE, false);

  it('sets a value it holds', () => {
    expect(buildUpdateInput(form, 'asset-1').installationDate).toEqual({
      value: '2024-03-01',
    });
  });

  it('clears one the user emptied — never omits it', () => {
    const input = buildUpdateInput(
      { ...form, installationDate: '' },
      'asset-1'
    );
    expect(input.installationDate).toEqual({ value: null });
  });

  it('states every one of them explicitly', () => {
    const input = buildUpdateInput(form, 'asset-1');
    for (const key of [
      'serialNumber',
      'installationDate',
      'replacementDate',
      'warrantyStart',
      'warrantyEnd',
      'donorNameId',
      'storeId',
    ] as const) {
      expect(input[key]).toBeDefined();
    }
  });
});

describe('AC-S5 locations are only editable on the asset’s own store', () => {
  it('is editable on a non-central site, whoever holds the asset', () => {
    expect(canEditLocations({ storeId: 'other' }, STORE, false)).toBe(true);
  });

  it('is editable on a central server for the active store’s own asset', () => {
    expect(canEditLocations({ storeId: STORE }, STORE, true)).toBe(true);
  });

  it('is NOT editable on a central server for another store’s asset', () => {
    expect(canEditLocations({ storeId: 'other' }, STORE, true)).toBe(false);
  });

  it('omits locationIds entirely rather than sending an empty list', () => {
    // Sending [] would RELEASE every location the asset holds — the assignment
    // is wholesale.
    const form = formFromAsset(asset({ storeId: 'other' }), STORE, true);
    expect(form.locationIds).toBeUndefined();
    expect(buildUpdateInput(form, 'asset-1')).not.toHaveProperty(
      'locationIds'
    );
  });

  it('sends the whole set when it IS editable — the assignment is wholesale', () => {
    const form = formFromAsset(asset(), STORE, false);
    expect(buildUpdateInput(form, 'asset-1').locationIds).toEqual(['loc-1']);
  });

  it('releases every location when the user empties the set', () => {
    const form = formFromAsset(asset(), STORE, false);
    expect(
      buildUpdateInput({ ...form, locationIds: [] }, 'asset-1').locationIds
    ).toEqual([]);
  });
});

describe('AC-E1 / AC-E2 the save action follows the draft', () => {
  const record = asset();
  const seed = formFromAsset(record, STORE, false);

  it('is unchanged on a freshly seeded draft', () => {
    expect(isUnchanged(seed, record, STORE, false)).toBe(true);
  });

  it('notices every editable field, one at a time', () => {
    const edits: Partial<typeof seed>[] = [
      { assetNumber: 'CCE-0002' },
      { serialNumber: 'SN-2' },
      { notes: 'other' },
      { installationDate: '2025-01-01' },
      { replacementDate: '2031-01-01' },
      { warrantyStart: '2024-01-01' },
      { warrantyEnd: '2027-01-01' },
      { needsReplacement: false },
      { donorNameId: 'donor-1' },
      { storeId: 'store-b' },
      { locationIds: ['loc-2'] },
      { properties: { climate_zone: 'Cold' } },
    ];
    for (const edit of edits) {
      expect(isUnchanged({ ...seed, ...edit }, record, STORE, false)).toBe(
        false
      );
    }
  });

  it('does not read a reordered location set as a change', () => {
    const two = asset({
      locations: {
        totalCount: 2,
        nodes: [{ id: 'a' }, { id: 'b' }],
      },
    } as Partial<AssetDetail>);
    const form = formFromAsset(two, STORE, false);
    expect(
      isUnchanged({ ...form, locationIds: ['b', 'a'] }, two, STORE, false)
    ).toBe(true);
  });
});

describe('AC-B5 a scan-locked field is read-only', () => {
  const locked = asset({
    lockedFields: {
      serialNumber: true,
      catalogueItemId: true,
      warrantyStart: true,
      warrantyEnd: false,
    },
  } as Partial<AssetDetail>);

  it('locks the fields the barcode supplied', () => {
    expect(isLockedField(locked, 'serialNumber', false)).toBe(true);
    expect(isLockedField(locked, 'warrantyStart', false)).toBe(true);
  });

  it('leaves the ones it did not supply editable', () => {
    expect(isLockedField(locked, 'warrantyEnd', false)).toBe(false);
  });

  it('lets a server administrator override the lock', () => {
    expect(isLockedField(locked, 'serialNumber', true)).toBe(false);
  });

  it('locks nothing on a hand-created asset', () => {
    expect(isLockedField(asset(), 'serialNumber', false)).toBe(false);
  });
});
