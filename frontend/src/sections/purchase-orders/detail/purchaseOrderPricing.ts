import type {
  PurchaseOrderDetailLineFragment,
  PurchaseOrderInfoFragment,
  PurchaseOrderLineSetResult,
} from './purchaseOrderDetail.generated';

// An order's money, as the screen assembles it (spec/purchase-orders rules §
// pricing and totals). Pure, so the arithmetic is covered directly.
//
// A line's cost is the server's stored `lineTotal` with the order's supplier
// discount apportioned to it, read straight off the row as
// `lineTotalAfterSupplierDiscount` (rules § pricing and totals) — nothing here
// recomputes it for a saved line. The order total comes off the node: the
// server's `purchase_order_stats` view sums the lines' stored totals, service
// lines included, less the supplier discount.

type Quantities = Pick<
  PurchaseOrderDetailLineFragment,
  'requestedNumberOfUnits' | 'requestedPackSize'
>;

/**
 * A line's packs — the requested quantity over its pack size. A pack size of
 * zero yields 0, not an infinity: the server writes such a line's total as 0
 * and the line contributes nothing to the order's total, so the column that
 * reads across to Line cost must agree with it (rules § pricing and totals,
 * confirmed live — a 50-unit line at price 5 and pack size 0 left the total
 * unchanged).
 */
export const linePacks = (line: Quantities): number =>
  line.requestedPackSize > 0
    ? line.requestedNumberOfUnits / line.requestedPackSize
    : 0;

type Discount = Pick<PurchaseOrderInfoFragment, 'supplierDiscountPercentage'>;

/**
 * The share of a figure left once the order's supplier discount is taken off
 * — the server's own rule for apportioning the discount to a line (rules §
 * pricing and totals). An absent discount leaves the figure whole.
 */
export const supplierDiscountFactor = (order: Discount): number =>
  1 - (order.supplierDiscountPercentage ?? 0) / 100;

/**
 * What the table WILL show as a line's cost, for a line being edited that has
 * not been saved yet (the editor's read-only Total cost row): the packs times
 * the after-discount pack price, on the server's own rule for what it stores,
 * with the order's supplier discount apportioned to it — none to a service
 * line. Zero for a zero-pack-size line, for the same reason as `linePacks`. A
 * saved line reads its stored `lineTotalAfterSupplierDiscount` directly
 * instead.
 */
export const projectedLineCost = (
  line: Quantities &
    Pick<PurchaseOrderDetailLineFragment, 'pricePerPackAfterDiscount'>,
  order: Discount,
  isService = false
): number =>
  linePacks(line) *
  line.pricePerPackAfterDiscount *
  (isService ? 1 : supplierDiscountFactor(order));

/**
 * Everything taken off a line: its packs at the before-discount price, less
 * the cost the table shows. That is the line's own discount and, on an order
 * still carrying a supplier discount, the line's share of it — so the row
 * reads across as packs × price − discount = line cost (rules § pricing and
 * totals). Never below zero: float noise on an undiscounted line would
 * otherwise format as "-0.00".
 */
export const lineDiscount = (
  line: Quantities &
    Pick<
      PurchaseOrderDetailLineFragment,
      'pricePerPackBeforeDiscount' | 'lineTotalAfterSupplierDiscount'
    >
): number =>
  Math.max(
    0,
    linePacks(line) * line.pricePerPackBeforeDiscount -
      line.lineTotalAfterSupplierDiscount
  );

type LineSetLine = Extract<
  PurchaseOrderLineSetResult['purchaseOrderLines'],
  { __typename: 'PurchaseOrderLineConnector' }
>['nodes'][number];

/**
 * The totals band's figures, left to right: the stock lines' cost, the
 * service lines' (the order's charges), and the order total they add up to.
 * The total is the server's; the charges are summed from the whole line set,
 * and the subtotal is what is left — so the band always reads across as
 * subtotal + charges = order total, a supplier discount included (rules §
 * pricing and totals).
 */
export const orderTotals = (
  node: Pick<PurchaseOrderInfoFragment, 'orderTotalAfterDiscount'>,
  lines: readonly Pick<LineSetLine, 'item' | 'lineTotalAfterSupplierDiscount'>[]
) => {
  const service = lines.filter(line => line.item.type === 'SERVICE');
  const charges = service.reduce(
    (sum, line) => sum + line.lineTotalAfterSupplierDiscount,
    0
  );
  return {
    subtotal: node.orderTotalAfterDiscount - charges,
    charges,
    hasCharges: service.length > 0,
    total: node.orderTotalAfterDiscount,
  };
};
