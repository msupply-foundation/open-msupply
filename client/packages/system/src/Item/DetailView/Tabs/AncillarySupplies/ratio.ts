/**
 * Ancillary item ratios are stored as a pair of numbers —
 * `item_quantity` : `ancillary_quantity` — preserving the user's entered `x:y`
 * exactly (no round-trip through a single decimal).
 *
 * Examples:
 *   100:1  — 100 vaccines need 1 safety box
 *   1:1.1  — each principal needs 1.1 ancillary (10% wastage)
 */

/** Render the stored pair as a readable `x:y` string for table display. */
export const formatRatio = (
  itemQuantity: number,
  ancillaryQuantity: number
): string => `${trim(itemQuantity)}:${trim(ancillaryQuantity)}`;

const trim = (n: number) => Number(n.toFixed(4)).toString();
