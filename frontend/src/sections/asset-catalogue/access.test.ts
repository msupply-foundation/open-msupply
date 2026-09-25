import { describe, expect, it } from 'vitest';
import { CATALOGUE_WRITE, REASON_WRITE, missingFor } from './access';

// Anchors: spec/asset-catalogue/acceptance.md AC-A5–AC-A10 — the permission
// mirror. Each write needs two permissions; the mirror names what is missing,
// in the spelling the permission-denied modal humanises. (That the affordance
// then raises the modal and sends nothing is the e2e suite's.)

const holding =
  (...held: string[]) =>
  (permission: string) =>
    held.includes(permission);

describe('AC-A5 / AC-A6 / AC-A9 — catalogue writes need the catalogue-item change AND the central-data permission', () => {
  it('both held: nothing missing', () => {
    expect(
      missingFor(
        CATALOGUE_WRITE,
        holding('ASSET_CATALOGUE_ITEM_MUTATE', 'EDIT_CENTRAL_DATA')
      )
    ).toEqual([]);
  });
  it('catalogue-item change alone: the central-data permission is missing', () => {
    expect(
      missingFor(CATALOGUE_WRITE, holding('ASSET_CATALOGUE_ITEM_MUTATE'))
    ).toEqual(['EditCentralData']);
  });
  it('asset read alone: both are missing', () => {
    expect(missingFor(CATALOGUE_WRITE, holding('ASSET_QUERY'))).toEqual([
      'AssetCatalogueItemMutate',
      'EditCentralData',
    ]);
  });
});

describe('AC-A7 / AC-A8 / AC-A10 — reason writes need the asset change AND the central-data permission', () => {
  it('asset change alone: the central-data permission is missing', () => {
    expect(missingFor(REASON_WRITE, holding('ASSET_MUTATE'))).toEqual([
      'EditCentralData',
    ]);
  });
  it('the catalogue-item change permission does not stand in for asset change', () => {
    expect(
      missingFor(
        REASON_WRITE,
        holding('ASSET_CATALOGUE_ITEM_MUTATE', 'EDIT_CENTRAL_DATA')
      )
    ).toEqual(['AssetMutate']);
  });
});
