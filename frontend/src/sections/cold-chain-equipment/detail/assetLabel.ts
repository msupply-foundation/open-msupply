import { exportDate } from '@/intl/formatDateTime';
import type { AssetDetailFragment } from '../equipment.generated';

// The asset label's payload (ui-surface S2 › Print asset label): the code the
// label's DataMatrix carries — the asset's own id, which a scan resolves back
// to this asset (rules › scanning an asset) — and the human-readable lines
// beside it. Delivering it is domain/labelPrinter's job; what it SAYS is this
// vertical's.
export interface AssetLabelPayload {
  code: string;
  assetNumber: string;
  datePrinted: string;
  storeName: string;
}

/**
 * Build the label for `asset`, printed on `printedOn`. The store is the one
 * HOLDING the asset — not the store the user is logged into, which on a
 * central server can be another — and is blank for an asset no store holds.
 * The date keeps Latin digits (`exportDate`): the printer's font has no others.
 */
export const buildAssetLabel = (
  asset: Pick<AssetDetailFragment, 'id' | 'assetNumber' | 'store'>,
  printedOn: Date
): AssetLabelPayload => ({
  code: asset.id,
  assetNumber: asset.assetNumber ?? '',
  datePrinted: exportDate(printedOn),
  storeName: asset.store?.storeName ?? '',
});
