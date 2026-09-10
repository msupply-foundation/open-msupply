// Where a line's requested quantity comes from, and whether the surfaces that
// show it appear at all (spec/inbound-shipments rules.md § requested quantity
// and supplier comment). Shared by the detail view's Requested column and the
// line editor's banner so the two can't disagree.

/** A line of the linked internal order, as the order-lines lookup gives it. */
export type OrderLine = {
  item: { id: string };
  requestedQuantity: number;
};

/**
 * Whether the shipment states internal-order context at all
 * (OMS-REG-ISH-01.14). A purchase-order-linked shipment is excluded even when
 * it has a requisition: its requested quantities come from the order itself, so
 * a second, differently-sourced "Requested" beside them would contradict it.
 */
export const showsInternalOrderContext = (
  hasInternalOrder: boolean,
  isPurchaseOrderLinked: boolean
): boolean => hasInternalOrder && !isPurchaseOrderLinked;

/**
 * The units requested for `itemId`, or undefined when the order has no line for
 * it (OMS-REG-ISH-01.13/.16). Matched on ITEM alone — there is no per-line link
 * — so every batch of one item resolves the same figure.
 *
 * `lineRequestedQuantity` (the line's own `requisitionLine`) wins where there is
 * a line: the server resolves it without a store filter, so it still answers for
 * a requisition link that arrived by sync from another store (contract.md wire
 * trap). `orderLines` is the only source in add mode, and is what tells an item
 * that isn't on the order apart from one that is.
 */
export const requestedQuantityForItem = (
  itemId: string | undefined,
  lineRequestedQuantity: number | null | undefined,
  orderLines: readonly OrderLine[]
): number | undefined => {
  if (itemId == null) return undefined;
  if (lineRequestedQuantity != null) return lineRequestedQuantity;
  return orderLines.find(line => line.item.id === itemId)?.requestedQuantity;
};
