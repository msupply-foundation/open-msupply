// Pure logic for the Barcodes tab (spec/items/ui-surface.md S2 › Barcodes tab;
// spec/barcode-scanning/rules.md § Maintaining barcodes, § Permissions;
// decisions/2026-09-30_barcodes.md). Kept out of the components so the gates,
// the rows and the save inputs are unit-tested without rendering.

import { t } from '@/intl';
import type { BarcodeTarget } from '@/domain/barcode';
import type { ItemBarcodesResult } from './itemBarcodes.generated';

/** A confirmed barcode, as the query reads it (kdd/type-safety). */
export type ConfirmedBarcode = ItemBarcodesResult['itemBarcodes'][number];
/** A store's proposal, as the query reads it. */
export type BarcodeProposal =
  ItemBarcodesResult['itemBarcodeProposals'][number];
/** One of the item's variants, auto-created ones included. */
export type BarcodeVariant = Extract<
  ItemBarcodesResult['items'],
  { __typename: 'ItemConnector' }
>['nodes'][number]['variants'][number];

/**
 * A row of the tab: a confirmed barcode with the item variant it's on, or a
 * proposal awaiting central.
 */
export type BarcodeRow =
  | {
      status: 'confirmed';
      barcode: ConfirmedBarcode;
      variant: BarcodeVariant | undefined;
    }
  | { status: 'proposed'; barcode: BarcodeProposal };

/** The item's variants, auto-created ones included. */
export const barcodeVariants = (data: ItemBarcodesResult): BarcodeVariant[] =>
  data.items.__typename === 'ItemConnector'
    ? (data.items.nodes[0]?.variants ?? [])
    : [];

/** Confirmed barcodes, then proposals oldest first, as the server sends. */
export const barcodeRows = (data: ItemBarcodesResult): BarcodeRow[] => {
  const variants = barcodeVariants(data);
  return [
    ...data.itemBarcodes.map(barcode => ({
      status: 'confirmed' as const,
      barcode,
      variant: variants.find(variant => variant.id === barcode.itemVariantId),
    })),
    ...data.itemBarcodeProposals.map(barcode => ({
      status: 'proposed' as const,
      barcode,
    })),
  ];
};

/**
 * Which variant a confirmed barcode is on, as the Variant column names it: the
 * item variant, and its packaging level where that was named for more than the
 * barcode. Blank for an auto-created variant — it isn't a variant to anyone but
 * central, and the Status column says it's barcode only.
 */
export const variantLabel = (row: BarcodeRow): string => {
  if (row.status !== 'confirmed' || !row.variant) return '';
  if (row.variant.isAutoCreated) return '';
  const packaging = row.variant.packagingVariants.find(
    packagingVariant => packagingVariant.id === row.barcode.id
  );
  return packaging && packaging.name !== row.barcode.barcode
    ? `${row.variant.name} – ${packaging.name}`
    : row.variant.name;
};

/** The Manufacturer column: the confirmed barcode's variant's. */
export const manufacturerLabel = (row: BarcodeRow): string =>
  row.status === 'confirmed' ? (row.variant?.manufacturer?.name ?? '') : '';

/** A choice in the dialog's "Put it on" select. */
export type TargetOption = {
  value: string;
  label: string;
  description?: string;
  target: BarcodeTarget;
};

export const AUTO_CREATED_TARGET = 'auto-created';

/**
 * Where central can put a barcode it adds or confirms (rules § Maintaining
 * barcodes): by default on its own, out of sight of variant lists; or on one of
 * the item's real variants — an empty packaging level of it, or a new one.
 * Auto-created variants aren't offered by name: the first choice already puts
 * the barcode on the one for its manufacturer.
 */
export const targetOptions = (variants: BarcodeVariant[]): TargetOption[] => [
  {
    value: AUTO_CREATED_TARGET,
    label: t('label.barcode-target-auto-created'),
    description: t('description.barcode-target-auto-created'),
    target: { kind: 'auto-created' },
  },
  ...variants
    .filter(variant => !variant.isAutoCreated)
    .flatMap((variant): TargetOption[] => [
      ...variant.packagingVariants
        .filter(packagingVariant => !packagingVariant.barcode)
        .map(packagingVariant => ({
          value: `packaging-variant:${packagingVariant.id}`,
          label: `${variant.name} – ${packagingVariant.name}`,
          ...(packagingVariant.packSize == null
            ? {}
            : {
                description: t('label.barcode-target-pack-size', {
                  packSize: packagingVariant.packSize,
                }),
              }),
          target: {
            kind: 'packaging-variant' as const,
            id: packagingVariant.id,
          },
        })),
      {
        value: `item-variant:${variant.id}`,
        label: t('label.barcode-target-new-packaging', {
          variant: variant.name,
        }),
        target: { kind: 'item-variant', id: variant.id },
      },
    ]),
];

/**
 * A packaging level has its own pack size and the variant its manufacturer,
 * so the dialog asks for them only where the barcode gets a new one: a pack
 * size unless it goes on an existing packaging level, a manufacturer only for
 * an auto-created variant (which is per manufacturer).
 */
export const asksPackSize = (target: BarcodeTarget): boolean =>
  target.kind !== 'packaging-variant';
export const asksManufacturer = (target: BarcodeTarget): boolean =>
  target.kind === 'auto-created';

/** The site of the store the tab is open in, where the query read it. */
export const thisSiteId = (data: ItemBarcodesResult): number | undefined =>
  data.store.__typename === 'StoreNode' ? data.store.siteId : undefined;

/**
 * Whether the row is a proposal this site may withdraw: one made by a store on
 * this site (rules § Learning a barcode). Away from central every listed
 * proposal is; on central only its own stores' are — another site's proposal
 * belongs to that site, and a delete from central would never reach it.
 */
export const canWithdraw = (
  row: BarcodeRow,
  isCentral: boolean,
  siteId: number | undefined
): boolean =>
  row.status === 'proposed' &&
  (!isCentral ||
    (siteId !== undefined && row.barcode.store?.siteId === siteId));

/** The item whose Barcodes tab this is. */
export type NamedItem = { id: string; code: string; name: string };

type Permission =
  | 'ITEM_MUTATE'
  | 'ITEM_NAMES_CODES_AND_UNITS_MUTATE'
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
 * Who may change the item's barcodes. On central that's confirming, adding
 * and removing them, which needs item editing — the UI mirror of the server's
 * MutateItems check, which remains the guard. Elsewhere it's only adding a
 * barcode, as a proposal.
 */
export const canManageBarcodes = (
  hasPermission: (permission: Permission) => boolean,
  isCentral: boolean
): boolean =>
  isCentral
    ? hasPermission('ITEM_MUTATE')
    : BARCODE_PERMISSIONS.some(hasPermission);

/**
 * Who may make a barcode-only variant a real one: central only, with the
 * variant-editing permission — the UI mirror of the server's
 * MutateItemNamesCodesAndUnits check, as for every variant change.
 */
export const canMakeBarcodeVariant = (
  hasPermission: (permission: Permission) => boolean,
  isCentral: boolean
): boolean => isCentral && hasPermission('ITEM_NAMES_CODES_AND_UNITS_MUTATE');

/** The Add barcode form. */
export type BarcodeDraft = {
  barcode: string;
  packSize: number | undefined;
  manufacturer: { id: string; name: string } | undefined;
};

export const EMPTY_DRAFT: BarcodeDraft = {
  barcode: '',
  packSize: undefined,
  manufacturer: undefined,
};

/**
 * Save is offered once a barcode is typed. It is sent as typed — the server
 * puts it in its standard form — so only one that is nothing but whitespace
 * is refused. A pack size, when given, is above 0.
 */
export const isDraftValid = (draft: BarcodeDraft): boolean =>
  draft.barcode.trim() !== '' &&
  (draft.packSize === undefined || draft.packSize > 0);

/**
 * The save for Add barcode: this barcode for this item. On central, `target`
 * is where it goes, and the pack size and manufacturer are sent only where it
 * asks for them; a proposal (no `target`) sends whatever was given.
 */
export const addInput = (
  draft: BarcodeDraft,
  itemId: string,
  target?: BarcodeTarget
) => ({
  barcode: draft.barcode,
  itemId,
  ...(draft.packSize === undefined || (target && !asksPackSize(target))
    ? {}
    : { packSize: draft.packSize }),
  ...(draft.manufacturer === undefined || (target && !asksManufacturer(target))
    ? {}
    : { manufacturerId: draft.manufacturer.id }),
});
