// The internal-order context an inbound shipment's lines carry: the quantity
// requested for a line's ITEM on the linked internal order, and — beside it in
// the line editor — the supplying store's comment on any shortfall
// (spec/inbound-shipments rules.md § requested quantity and supplier comment;
// OMS-REG-ISH-01.12–.17).
//
// Extracted from the two surfaces that read it (the line table's Requested
// column and the line editor's context band) because the resolution rule is the
// whole behaviour and neither surface is where it should be argued.

/** A line of the linked internal order, as the order-lines lookup gives it. */
export type OrderLine = {
  item: { id: string };
  requestedQuantity: number;
};

/**
 * Whether the line table shows the Requested column, and the editor its
 * internal-order band (OMS-REG-ISH-01.14).
 *
 * Two conditions, and they are NOT the same one twice:
 *  - the shipment is linked to an internal order — however that link arose:
 *    linked by hand here, or created as the receiving mirror of the store's own
 *    internal order once the supplying store shipped;
 *  - it is not purchase-order-linked. A PO-linked shipment's requested
 *    quantities come from the order itself (the PO-line columns and the
 *    financial & delivery tab), so a second, differently-sourced "Requested"
 *    beside them would read as a contradiction.
 */
export const showsInternalOrderContext = (
  hasInternalOrder: boolean,
  isPurchaseOrderLinked: boolean
): boolean => hasInternalOrder && !isPurchaseOrderLinked;

/**
 * The units requested for `itemId` on the linked internal order, or undefined
 * when the order has no line for that item (OMS-REG-ISH-01.13/.16).
 *
 * Two sources, one answer:
 *  - `lineRequestedQuantity` — what the shipment LINE resolved through its own
 *    `requisitionLine`. The authority wherever there is a line, because the
 *    server resolves it without a store filter and so still answers for a
 *    requisition link that arrived by sync from another store
 *    (contract.md § requested quantity and supplier comment, wire trap).
 *  - `orderLines` — the linked order's own lines. The only source in ADD mode,
 *    where the chosen item has no line on this shipment yet, and what tells an
 *    item that simply isn't on the order apart from one that is.
 *
 * The match is on ITEM alone: there is no per-line link between a shipment line
 * and an order line, so every batch of one item resolves the same figure.
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
