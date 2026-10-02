// Pure logic for the Barcodes tab (spec/items/ui-surface.md S2 › Barcodes tab;
// spec/barcode-scanning/rules.md § Maintaining barcodes, § Permissions;
// decisions/2026-09-30_barcodes.md). Kept out of the components so the gates,
// the rows and the save inputs are unit-tested without rendering.

import type { ItemBarcodesResult } from './itemBarcodes.generated';

/** A confirmed barcode, as the query reads it (kdd/type-safety). */
export type ConfirmedBarcode = ItemBarcodesResult['itemBarcodes'][number];
/** A store's proposal, as the query reads it. */
export type BarcodeProposal =
  ItemBarcodesResult['itemBarcodeProposals'][number];

/** A row of the tab: a confirmed barcode, or a proposal awaiting central. */
export type BarcodeRow =
  | { status: 'confirmed'; barcode: ConfirmedBarcode }
  | { status: 'proposed'; barcode: BarcodeProposal };

/** Confirmed barcodes, then proposals oldest first, as the server sends. */
export const barcodeRows = (data: ItemBarcodesResult): BarcodeRow[] => [
  ...data.itemBarcodes.map(barcode => ({
    status: 'confirmed' as const,
    barcode,
  })),
  ...data.itemBarcodeProposals.map(barcode => ({
    status: 'proposed' as const,
    barcode,
  })),
];

/** An item as the Move step names it. */
export type NamedItem = { id: string; code: string; name: string };

type Permission =
  | 'ITEM_MUTATE'
  | 'STOCK_LINE_MUTATE'
  | 'INBOUND_SHIPMENT_MUTATE'
  | 'INVENTORY_ADJUSTMENT_MUTATE';

/**
 * Away from central, any one of the four stock-handling permissions lets a user
 * add a barcode, which proposes it (rules § Permissions).
 */
export const BARCODE_PERMISSIONS: readonly Permission[] = [
  'ITEM_MUTATE',
  'STOCK_LINE_MUTATE',
  'INBOUND_SHIPMENT_MUTATE',
  'INVENTORY_ADJUSTMENT_MUTATE',
];

/**
 * Who may change the item's barcodes. On central that's confirming, adding,
 * moving and removing them, which needs item editing — the UI mirror of the
 * server's MutateItems check, which remains the guard. Elsewhere it's only
 * adding a barcode, as a proposal.
 */
export const canManageBarcodes = (
  hasPermission: (permission: Permission) => boolean,
  isCentral: boolean
): boolean =>
  isCentral
    ? hasPermission('ITEM_MUTATE')
    : BARCODE_PERMISSIONS.some(hasPermission);

/** The Add barcode form. */
export type BarcodeDraft = { barcode: string; packSize: number | undefined };

export const EMPTY_DRAFT: BarcodeDraft = { barcode: '', packSize: undefined };

/**
 * Save is offered once a barcode is typed. It is sent as typed — the server
 * puts it in its standard form — so only one that is nothing but whitespace
 * is refused. A pack size, when given, is above 0.
 */
export const isDraftValid = (draft: BarcodeDraft): boolean =>
  draft.barcode.trim() !== '' &&
  (draft.packSize === undefined || draft.packSize > 0);

/** The save for Add barcode: this barcode for this item. */
export const addInput = (draft: BarcodeDraft, itemId: string) => ({
  barcode: draft.barcode,
  itemId,
  ...(draft.packSize === undefined ? {} : { packSize: draft.packSize }),
});
