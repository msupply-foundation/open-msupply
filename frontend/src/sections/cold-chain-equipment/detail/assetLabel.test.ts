import { describe, expect, it } from 'vitest';
import { buildAssetLabel } from './assetLabel';

const store = {
  __typename: 'StoreNode' as const,
  id: 'store-b',
  code: 'B',
  storeName: 'Mbeya Regional Hospital',
  siteId: 2,
};

describe('buildAssetLabel (OMS-REG-CCE-01.5)', () => {
  it("carries the asset's id, number, the print date and its store's name", () => {
    expect(
      buildAssetLabel(
        { id: 'asset-1', assetNumber: 'KEN-0042', store },
        new Date(2026, 9, 14)
      )
    ).toEqual({
      code: 'asset-1',
      assetNumber: 'KEN-0042',
      datePrinted: '14/10/2026',
      storeName: 'Mbeya Regional Hospital',
    });
  });

  it('prints blank lines rather than failing for an asset with no number or store', () => {
    const label = buildAssetLabel(
      { id: 'asset-2', assetNumber: null, store: null },
      new Date(2026, 9, 14)
    );
    expect(label.assetNumber).toBe('');
    expect(label.storeName).toBe('');
  });
});
