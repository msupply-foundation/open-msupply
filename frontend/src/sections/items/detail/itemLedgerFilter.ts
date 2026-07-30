import type { IsoDateTimeRange } from '../../../ui/elements/selectors/FilterBar';
import type {
  ItemLedgerResult,
  ItemLedgerVariables,
} from './itemLedger.generated';

// Pure filter logic for the item detail's Ledger tab (spec/items S2 › Ledger
// tab). Colocated + pure so the chip-state → wire-filter mapping is unit-tested
// without standing up the panel — the same split the list side uses
// (itemFilter.ts).

type LedgerRow = ItemLedgerResult['itemLedger']['nodes'][number];
export type InvoiceType = LedgerRow['invoiceType'];
export type InvoiceStatus = LedgerRow['invoiceStatus'];

/**
 * The UI-side filter state (URL-backed), one member per FilterBar chip.
 *
 * `null` members are FilterBar's "added but empty" marker — a chip that is on
 * the bar with nothing chosen yet — and every one of them maps to NO wire
 * filter. The datetime bounds are ONE member, not a from/to pair, because they
 * are one chip (the reference app groups them under a single "Date/time" filter
 * too).
 *
 * This object is always carried as a SINGLE nested value in the URL state,
 * never spread across its top level: FilterBar expresses a chip removal as the
 * key's absence, so the filter must be replaced wholesale rather than merged,
 * and useUrlQueryState strips top-level nulls when parsing a URL (which would
 * erase an added-but-empty chip on the round trip).
 */
export type LedgerFilter = {
  invoiceType?: InvoiceType | null;
  invoiceStatus?: InvoiceStatus | null;
  datetime?: IsoDateTimeRange | null;
};

/** The UI filter state → the wire ItemLedgerFilterInput, scoped to one item. */
export const buildWireFilter = (
  itemId: string,
  f: LedgerFilter
): NonNullable<ItemLedgerVariables['filter']> => {
  const filter: NonNullable<ItemLedgerVariables['filter']> = {
    itemId: { equalTo: itemId },
  };
  if (f.invoiceType) filter.invoiceType = { equalTo: f.invoiceType };
  if (f.invoiceStatus) filter.invoiceStatus = { equalTo: f.invoiceStatus };
  // An added-but-empty chip (null, or a range with neither bound set) applies
  // nothing — so seeding the chip present never perturbs the query.
  const range = f.datetime;
  if (range?.start || range?.end) {
    filter.datetime = {
      ...(range.start ? { afterOrEqualTo: range.start } : {}),
      ...(range.end ? { beforeOrEqualTo: range.end } : {}),
    };
  }
  return filter;
};
