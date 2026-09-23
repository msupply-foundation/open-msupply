import { formatNumber, getPlural, tPlural, type LocaleKey } from '@/intl';
import type { PurchaseOrderStatus } from '../../purchaseOrderStatus';
import type {
  InsertPurchaseOrderLineVariables,
  PurchaseOrderDetailLineFragment,
  UpdatePurchaseOrderLineVariables,
} from '../purchaseOrderDetail.generated';
import { isDrafting } from '../purchaseOrderLadder';
import { linePacks } from '../purchaseOrderPricing';

// The line editor's arithmetic and gates (spec/purchase-orders rules §
// authoring a line), pure so node vitest covers them directly. The component
// holds a LineDraft and patches it through these; a save diffs the draft
// against what the line held and sends only what moved.

/** Both prices take six decimals (OMS-FUN-PO-07.1). */
export const PRICE_DECIMALS = 6;

export type LineStatus = PurchaseOrderDetailLineFragment['status'];

/** What the editor shows and never writes: the item and the line's facts. */
export type LineFacts = {
  /** Absent until the line exists. */
  lineId?: string;
  lineNumber: number;
  status: LineStatus;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitName: string | null;
  stockOnHand: number;
  unitsOrderedInOthers: number;
};

/** Every field the editor may write. */
export type LineDraft = {
  requestedPackSize: number;
  requestedNumberOfUnits: number;
  adjustedNumberOfUnits: number | null;
  pricePerPackBeforeDiscount: number;
  /** Not stored: recovered from the two prices on open (rules § prices). */
  discountPercentage: number;
  pricePerPackAfterDiscount: number;
  requestedDeliveryDate: string | null;
  expectedDeliveryDate: string | null;
  supplierItemCode: string;
  manufacturer: { id: string; name: string } | null;
  comment: string;
  note: string;
};

export const factsFromLine = (
  line: PurchaseOrderDetailLineFragment
): LineFacts => ({
  lineId: line.id,
  lineNumber: line.lineNumber,
  status: line.status,
  itemId: line.item.id,
  itemCode: line.item.code,
  itemName: line.item.name,
  unitName: line.unit ?? line.item.unitName,
  stockOnHand: line.item.stats.stockOnHand,
  unitsOrderedInOthers: line.unitsOrderedInOthers,
});

export const draftFromLine = (
  line: PurchaseOrderDetailLineFragment
): LineDraft => ({
  requestedPackSize: line.requestedPackSize,
  requestedNumberOfUnits: line.requestedNumberOfUnits,
  adjustedNumberOfUnits: line.adjustedNumberOfUnits ?? null,
  pricePerPackBeforeDiscount: line.pricePerPackBeforeDiscount,
  discountPercentage: discountPercentage(
    line.pricePerPackBeforeDiscount,
    line.pricePerPackAfterDiscount
  ),
  pricePerPackAfterDiscount: line.pricePerPackAfterDiscount,
  requestedDeliveryDate: line.requestedDeliveryDate ?? null,
  expectedDeliveryDate: line.expectedDeliveryDate ?? null,
  supplierItemCode: line.supplierItemCode ?? '',
  manufacturer: line.manufacturer
    ? { id: line.manufacturer.id, name: line.manufacturer.name }
    : null,
  comment: line.comment ?? '',
  note: line.note ?? '',
});

/**
 * What a new line is born as (OMS-FUN-PO-02.7): the item's default pack size,
 * no quantity, no prices, and its dates seeded from the order — the order's
 * requested delivery date and the latest expected date already on its lines.
 */
export const newLineDraft = (
  item: { defaultPackSize: number },
  seed: {
    requestedDeliveryDate: string | null | undefined;
    latestExpectedDate: string | null | undefined;
  }
): LineDraft => ({
  requestedPackSize: item.defaultPackSize,
  requestedNumberOfUnits: 0,
  adjustedNumberOfUnits: null,
  pricePerPackBeforeDiscount: 0,
  discountPercentage: 0,
  pricePerPackAfterDiscount: 0,
  requestedDeliveryDate: seed.requestedDeliveryDate ?? null,
  expectedDeliveryDate: seed.latestExpectedDate ?? null,
  supplierItemCode: '',
  manufacturer: null,
  comment: '',
  note: '',
});

// ─── Quantities ─────────────────────────────────────────────────────────────

/**
 * The packs the editor shows: the expected quantity over the pack size, on the
 * same rule the table's column and the order's totals use (OMS-FUN-PO-07.4).
 */
export const draftPacks = (draft: LineDraft): number =>
  linePacks({ ...draft, pricePerPackAfterDiscount: 0 });

/**
 * Which quantity a units figure writes (OMS-FUN-PO-02.12): both, equal, while
 * drafting; the adjusted one alone from Ready for sending.
 */
export const quantityPatch = (
  status: PurchaseOrderStatus,
  units: number
):
  | Pick<LineDraft, 'requestedNumberOfUnits' | 'adjustedNumberOfUnits'>
  | Pick<LineDraft, 'adjustedNumberOfUnits'> =>
  isDrafting(status)
    ? { requestedNumberOfUnits: units, adjustedNumberOfUnits: units }
    : { adjustedNumberOfUnits: units };

/** Packs typed → the quantity in units is packs × pack size. */
export const packsEntered = (
  status: PurchaseOrderStatus,
  draft: LineDraft,
  packs: number
): Partial<LineDraft> => quantityPatch(status, packs * draft.requestedPackSize);

/** A new pack size keeps the packs authored and moves the units with it. */
export const packSizeEntered = (
  status: PurchaseOrderStatus,
  draft: LineDraft,
  packSize: number
): Partial<LineDraft> => ({
  requestedPackSize: packSize,
  ...quantityPatch(status, draftPacks(draft) * packSize),
});

/**
 * One input, two labels (spec S10 § middle): Requested packs while drafting,
 * Adjusted packs once Ready for sending or Sent — and, the spec's one
 * exception, Requested packs again on a Finalised order.
 */
export const packsLabelKey = (status: PurchaseOrderStatus): LocaleKey =>
  status === 'CONFIRMED' || status === 'SENT'
    ? 'label.adjusted-packs'
    : 'label.requested-packs';

/** The read-only Adjusted units row appears once the order is past approval. */
export const showsAdjustedUnits = (status: PurchaseOrderStatus): boolean =>
  !isDrafting(status);

// ─── Prices ─────────────────────────────────────────────────────────────────

/**
 * The percentage is not stored: it is the relationship between the two prices
 * (rules § prices). Zero where there is no before-price to relate to.
 */
export const discountPercentage = (before: number, after: number): number =>
  before > 0 ? ((before - after) / before) * 100 : 0;

export type Prices = Pick<
  LineDraft,
  'pricePerPackBeforeDiscount' | 'discountPercentage' | 'pricePerPackAfterDiscount'
>;

/**
 * Editing any one of the three recomputes the others (OMS-FUN-PO-02.14,
 * OMS-FUN-PO-07.2): a new before-price or percentage recomputes the
 * after-price; a new after-price recomputes the percentage. The percentage is
 * held between 0 and 100.
 */
export const repriced = (changed: keyof Prices, prices: Prices): Prices => {
  const { pricePerPackBeforeDiscount, pricePerPackAfterDiscount } = prices;
  const discount = Math.min(Math.max(prices.discountPercentage, 0), 100);
  if (changed === 'pricePerPackAfterDiscount')
    return {
      pricePerPackBeforeDiscount,
      discountPercentage: discountPercentage(
        pricePerPackBeforeDiscount,
        pricePerPackAfterDiscount
      ),
      pricePerPackAfterDiscount,
    };
  return {
    pricePerPackBeforeDiscount,
    discountPercentage: discount,
    pricePerPackAfterDiscount: pricePerPackBeforeDiscount * (1 - discount / 100),
  };
};

// ─── Dates ──────────────────────────────────────────────────────────────────

/**
 * Setting the requested delivery date fills the expected one where that is
 * empty (OMS-FUN-PO-02.20).
 */
export const requestedDateEntered = (
  draft: LineDraft,
  date: string | null
): Partial<LineDraft> => ({
  requestedDeliveryDate: date,
  ...(date && !draft.expectedDeliveryDate
    ? { expectedDeliveryDate: date }
    : {}),
});

// ─── Gates ──────────────────────────────────────────────────────────────────

export type LineGates = {
  /**
   * The item chooser — live in add mode (OMS-FUN-PO-02.23), fixed on a line
   * opened from its row (OMS-FUN-PO-02.11).
   */
  item: boolean;
  /** The packs input (OMS-FUN-PO-02.13). */
  packs: boolean;
  /** Pack size, both prices, the supplier's code and the manufacturer. */
  drafting: boolean;
  /** Both delivery dates. */
  dates: boolean;
  /** The comment for the supplier and the internal note. */
  text: boolean;
  /** Never: nothing here changes a line's status (OMS-FUN-PO-02.22). */
  status: false;
};

/**
 * What the editor leaves open, over and above the domain's own gates (spec
 * S10): everything closes on a closed line or a Finalised order; the drafting
 * fields close from Ready for sending; the dates close once Sent; the packs
 * follow the quantity rule — requested while drafting, adjusted with the
 * authorise permission from Ready for sending.
 */
export const lineGates = (options: {
  status: PurchaseOrderStatus;
  lineStatus: LineStatus;
  addMode: boolean;
  canAuthorise: boolean;
}): LineGates => {
  const open =
    options.lineStatus !== 'CLOSED' && options.status !== 'FINALISED';
  const drafting = open && isDrafting(options.status);
  return {
    item: options.addMode,
    packs: open && (isDrafting(options.status) || options.canAuthorise),
    drafting,
    dates: open && options.status !== 'SENT',
    text: open,
    status: false,
  };
};

// ─── Saving ─────────────────────────────────────────────────────────────────

type UpdateInput = UpdatePurchaseOrderLineVariables['input'];
export type LineUpdatePatch = Omit<UpdateInput, 'id'>;

const nullable = (value: string) => ({ value: value || null });

/**
 * What a save sends: only the fields that moved, so an untouched line sends
 * nothing at all (OMS-FUN-PO-02.15) and an unchanged quantity never trips a
 * gate that fires on change alone. Undefined when nothing moved.
 */
export const lineChanges = (
  initial: LineDraft,
  draft: LineDraft
): LineUpdatePatch | undefined => {
  const patch: LineUpdatePatch = {};
  if (draft.requestedPackSize !== initial.requestedPackSize)
    patch.requestedPackSize = draft.requestedPackSize;
  if (draft.requestedNumberOfUnits !== initial.requestedNumberOfUnits)
    patch.requestedNumberOfUnits = draft.requestedNumberOfUnits;
  if (
    draft.adjustedNumberOfUnits !== initial.adjustedNumberOfUnits &&
    draft.adjustedNumberOfUnits !== null
  )
    patch.adjustedNumberOfUnits = draft.adjustedNumberOfUnits;
  if (draft.pricePerPackBeforeDiscount !== initial.pricePerPackBeforeDiscount)
    patch.pricePerPackBeforeDiscount = draft.pricePerPackBeforeDiscount;
  if (draft.pricePerPackAfterDiscount !== initial.pricePerPackAfterDiscount)
    patch.pricePerPackAfterDiscount = draft.pricePerPackAfterDiscount;
  if (draft.requestedDeliveryDate !== initial.requestedDeliveryDate)
    patch.requestedDeliveryDate = { value: draft.requestedDeliveryDate };
  if (draft.expectedDeliveryDate !== initial.expectedDeliveryDate)
    patch.expectedDeliveryDate = { value: draft.expectedDeliveryDate };
  if (draft.supplierItemCode !== initial.supplierItemCode)
    patch.supplierItemCode = nullable(draft.supplierItemCode);
  if ((draft.manufacturer?.id ?? null) !== (initial.manufacturer?.id ?? null))
    patch.manufacturerId = { value: draft.manufacturer?.id ?? null };
  if (draft.comment !== initial.comment)
    patch.comment = nullable(draft.comment);
  if (draft.note !== initial.note) patch.note = nullable(draft.note);
  return Object.keys(patch).length > 0 ? patch : undefined;
};

/**
 * A new line's whole draft. The insert carries no adjusted quantity: the
 * server births a line with none, and the requested figure stands for both
 * until the order leaves drafting.
 */
export const insertInput = (
  id: string,
  purchaseOrderId: string,
  facts: Pick<LineFacts, 'itemId' | 'unitName'>,
  draft: LineDraft
): InsertPurchaseOrderLineVariables['input'] => ({
  id,
  purchaseOrderId,
  itemIdOrCode: facts.itemId,
  requestedPackSize: draft.requestedPackSize,
  requestedNumberOfUnits: draft.requestedNumberOfUnits,
  pricePerPackBeforeDiscount: draft.pricePerPackBeforeDiscount,
  pricePerPackAfterDiscount: draft.pricePerPackAfterDiscount,
  requestedDeliveryDate: draft.requestedDeliveryDate,
  expectedDeliveryDate: draft.expectedDeliveryDate,
  supplierItemCode: draft.supplierItemCode || null,
  manufacturerId: draft.manufacturer?.id ?? null,
  comment: draft.comment || null,
  note: draft.note || null,
  unit: facts.unitName,
});

// ─── The ordered-elsewhere figure ───────────────────────────────────────────

/**
 * "12,000 tablets" — the item's unit pluralised for the count, falling back to
 * a bare "units" where the item has none (spec S10, OMS-FUN-PO-02.19).
 */
export const orderedElsewhere = (
  units: number,
  unitName: string | null
): string =>
  `${formatNumber(units)} ${
    unitName ? getPlural(unitName, units) : tPlural('label.units-plural', units)
  }`;
