// The store's default sell price carried to any pack size (spec/stock rules ›
// Default sell price for new stock). One definition for every stock-in
// screen — inbound shipment lines, the receive-by-scan window, a stocktake's
// new batches and the new stock line modal — so none of them does its own
// arithmetic.

/**
 * A per-pack figure for `defaultPackSize` carried to `packSize` at the same
 * figure per unit. Exactly `perPack` at `defaultPackSize` itself, so a pack
 * size changed away and back lands on the figure it started from. Zero where
 * there is no default pack size to divide by.
 */
export const perUnitAtPackSize = (
  perPack: number,
  defaultPackSize: number,
  packSize: number
): number => {
  if (!(defaultPackSize > 0)) return 0;
  if (packSize === defaultPackSize) return perPack;
  return (perPack / defaultPackSize) * packSize;
};

/** What the default sell price is read from. */
export type DefaultSellPriceSource = {
  /** The pack size the store's default sell price is for. */
  defaultPackSize: number;
  /** The store's default sell price for one pack of `defaultPackSize`. */
  defaultSellPricePerPack: number | null | undefined;
};

/**
 * The default sell price for one pack of `packSize`: the store's default sell
 * price per pack, divided by the item's default pack size, times `packSize`.
 * Zero where there is no default — none set, or no default pack size.
 */
export const defaultSellPriceAtPackSize = (
  item: DefaultSellPriceSource,
  packSize: number
): number =>
  perUnitAtPackSize(
    item.defaultSellPricePerPack ?? 0,
    item.defaultPackSize,
    packSize
  );

/**
 * Whether two prices are the same, allowing for the floating-point drift of a
 * price worked out per unit (a relative 1e-6, and absolute below 1).
 */
export const samePrice = (a: number, b: number): boolean =>
  Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * Whether `price` is the default sell price at `packSize` — a saved price
 * still at the default, which a pack-size change may move, as against one
 * the user typed, which it must keep.
 */
export const isDefaultSellPrice = (
  price: number,
  item: DefaultSellPriceSource,
  packSize: number
): boolean => samePrice(price, defaultSellPriceAtPackSize(item, packSize));
