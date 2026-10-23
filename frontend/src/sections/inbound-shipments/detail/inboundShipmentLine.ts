import type { InboundLineFragment } from './inboundShipmentDetail.generated';

// Line arithmetic shared by every surface that reports it. One definition
// because the sign convention is the whole point: the detail table's
// Difference column and the line editor's Difference cell each used to carry
// their own subtraction, with a comment promising the two agreed — and they
// did agree, in the direction OPPOSITE to the reference app (issue #562).

/**
 * The gap between what actually arrived and what the supplier declared they
 * sent, in PACKS.
 *
 * Read against **Packs received**, which is the figure it sits beside and the
 * one the receiver is entering: a POSITIVE difference means more arrived than
 * was declared, a negative one means the delivery fell short.
 *
 * `undefined` where nothing was recorded as shipped — there is nothing to
 * compare against, and a bare `0` there would read as "the two match".
 */
export const packDifference = (
  numberOfPacks: number,
  shippedNumberOfPacks: number | null | undefined
): number | undefined =>
  shippedNumberOfPacks == null
    ? undefined
    : numberOfPacks - shippedNumberOfPacks;

/*
 * What the "prompt for batch and expiry" store preference asks about before an
 * inbound line save, and marks once the user goes back to fill it in (issue
 * #992, OMS-REG-REPL-09.31–.39) — per batch, so the editor can say which batch
 * and which field.
 */

/** No batch number — blank, or whitespace only, which traces nothing. */
export const batchIsBlank = (b: { batch: string }): boolean => !b.batch.trim();

/** No expiry date. */
export const expiryIsBlank = (b: { expiryDate: string | null }): boolean =>
  !b.expiryDate;

/** Missing either one — enough on its own to prompt and to mark the batch. */
export const lacksBatchOrExpiry = (b: {
  batch: string;
  expiryDate: string | null;
}): boolean => batchIsBlank(b) || expiryIsBlank(b);

/**
 * What a set of batches is missing between them, so the words name only that:
 * `batch` or `expiry` when no batch lacks the other one, `either` once both
 * fields are blank somewhere; undefined when nothing is missing.
 */
export type MissingBatchField = 'batch' | 'expiry' | 'either';

export const missingBatchField = (
  bs: readonly { batch: string; expiryDate: string | null }[]
): MissingBatchField | undefined => {
  const batch = bs.some(batchIsBlank);
  const expiry = bs.some(expiryIsBlank);
  if (batch && expiry) return 'either';
  if (batch) return 'batch';
  if (expiry) return 'expiry';
  return undefined;
};

/*
 * What a new batch starts with (spec rules › new-batch defaults,
 * OMS-REG-REPL-09.10/.40–.43): its pack size, the cost AND sell price for that
 * pack size, and its volume per pack.
 */
export type NewBatchDefaults = {
  defaultPackSize: number;
  prefillPricePerPack: number;
  volumePerPack: number;
};

/**
 * An order line's price per pack — net of the supplier discount, in the
 * order's currency — in local currency at the shipment's rate. `rate` is
 * undefined on a home-currency shipment.
 */
export const orderLinePrice = (
  pricePerPackAfterSupplierDiscount: number,
  rate: number | undefined
): number => pricePerPackAfterSupplierDiscount * (rate ?? 1);

/**
 * A price for `defaultPackSize` carried to `packSize` at the same price per
 * unit — what a transfer's read-only cost follows when the pack size changes
 * (OMS-REG-REPL-09.44). Zero where there is no default pack size to divide by.
 */
export const priceAtPackSize = (
  price: number,
  defaultPackSize: number,
  packSize: number
): number => (defaultPackSize > 0 ? (price / defaultPackSize) * packSize : 0);

/**
 * The defaults for another batch of an item already on the shipment, read off
 * one of its existing lines: the order line it cites on a PO-linked shipment,
 * else the item.
 */
export const newBatchDefaultsFromLine = (
  line: Pick<InboundLineFragment, 'item' | 'purchaseOrderLine'>,
  rate: number | undefined
): NewBatchDefaults => {
  const orderLine = line.purchaseOrderLine;
  const volumePerPack = line.item?.volumePerPack ?? 0;
  return orderLine
    ? {
        defaultPackSize: orderLine.requestedPackSize || 1,
        prefillPricePerPack: orderLinePrice(
          orderLine.pricePerPackAfterSupplierDiscount,
          rate
        ),
        volumePerPack,
      }
    : {
        defaultPackSize: line.item?.defaultPackSize ?? 1,
        prefillPricePerPack:
          line.item?.itemStoreProperties?.defaultSellPricePerPack ?? 0,
        volumePerPack,
      };
};
