import type {
  PurchaseOrderDetailLineFragment,
  PurchaseOrderInfoFragment,
} from './purchaseOrderDetail.generated';

// An order's money, as the screen assembles it (spec/purchase-orders rules §
// pricing and totals). Pure, so the arithmetic is covered directly.
//
// A line's cost is the server's stored `lineTotal` with the order's supplier
// discount apportioned to it, read straight off the row as
// `lineTotalAfterSupplierDiscount` (rules § pricing and totals) — nothing here
// recomputes it for a saved line. Above the lines, the subtotal and the
// discounted total come off the node: the server's `purchase_order_stats` view
// sums the lines' stored totals, service lines included.

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
 * The totals band's three figures, left to right. `supplierDiscountAmount` is
 * the server's own resolution of the stored percentage against the subtotal,
 * so the band's arithmetic reads across.
 */
export const orderTotals = (
  node: Pick<
    PurchaseOrderInfoFragment,
    | 'orderTotalBeforeDiscount'
    | 'orderTotalAfterDiscount'
    | 'supplierDiscountAmount'
    | 'supplierDiscountPercentage'
  >
) => ({
  subtotal: node.orderTotalBeforeDiscount,
  discount: node.supplierDiscountAmount,
  discountPercentage: node.supplierDiscountPercentage ?? 0,
  total: node.orderTotalAfterDiscount,
});
