import type {
  PurchaseOrderDetailLineFragment,
  PurchaseOrderInfoFragment,
} from './purchaseOrderDetail.generated';

// An order's money, as the screen assembles it (spec/purchase-orders rules §
// pricing and totals). Pure, so the arithmetic is covered directly.
//
// Three figures exist and only two are stored: the subtotal and the discounted
// total come off the node (the server's `purchase_order_stats` view), and the
// FINAL COST — the discounted total plus the five additional charges — exists
// nowhere on the wire (contract ⚠️ the five charges reach no total on the
// server). The side panel is the only place it appears, so this module is the
// one place it is computed.

type Line = Pick<
  PurchaseOrderDetailLineFragment,
  | 'requestedNumberOfUnits'
  | 'adjustedNumberOfUnits'
  | 'requestedPackSize'
  | 'pricePerPackAfterDiscount'
>;

/**
 * The quantity the order expects of a line: its adjusted quantity where it
 * carries one, its requested quantity otherwise.
 */
const expectedUnits = (line: Line): number =>
  line.adjustedNumberOfUnits ?? line.requestedNumberOfUnits;

/**
 * A line's packs — the expected quantity over its pack size. A pack size of
 * zero yields 0, not an infinity: on the server the term is `NULLIF`'d away and
 * the line contributes nothing to the order's total, so the column that reads
 * across to Line cost must agree with it (rules § pricing and totals,
 * confirmed live — a 50-unit line at price 5 and pack size 0 left the total
 * unchanged).
 */
export const linePacks = (line: Line): number =>
  line.requestedPackSize > 0 ? expectedUnits(line) / line.requestedPackSize : 0;

/**
 * A line's cost: its packs times its price per pack AFTER the line's own
 * discount. Zero for a zero-pack-size line, for the same reason.
 */
export const lineCost = (line: Line): number =>
  linePacks(line) * line.pricePerPackAfterDiscount;

type Charges = Pick<
  PurchaseOrderInfoFragment,
  | 'agentCommission'
  | 'documentCharge'
  | 'communicationsCharge'
  | 'insuranceCharge'
  | 'freightCharge'
>;

/**
 * The five additional charges summed — the panel's "Additional fees" row. Each
 * is a nullable Float; an absent charge is zero. They are NOT part of either
 * stored total.
 */
export const chargesTotal = (node: Charges): number =>
  (node.agentCommission ?? 0) +
  (node.documentCharge ?? 0) +
  (node.communicationsCharge ?? 0) +
  (node.insuranceCharge ?? 0) +
  (node.freightCharge ?? 0);

/**
 * The figure users read as the order's final cost: the discounted total PLUS
 * the charges. The only place it appears is the side panel's last pricing row.
 */
export const finalCost = (
  node: Charges & Pick<PurchaseOrderInfoFragment, 'orderTotalAfterDiscount'>
): number => node.orderTotalAfterDiscount + chargesTotal(node);
