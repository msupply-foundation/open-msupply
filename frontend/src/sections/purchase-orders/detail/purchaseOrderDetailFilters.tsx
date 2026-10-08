import { t } from '@/intl';
import {
  FilterTextInput,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import type { PurchaseOrderDetailLinesVariables } from './purchaseOrderDetail.generated';

// The line filter EXACTLY as GraphQL expects it (kdd/type-safety: no
// remapping) — carried verbatim in the URL and passed straight through the
// query. The view merges the fixed purchaseOrderId scope in itself; it never
// appears in this shape.
export type PurchaseOrderLineFilter = NonNullable<
  PurchaseOrderDetailLinesVariables['filter']
>;

/*
 * Type-driven, EXHAUSTIVE filter definitions for an order's line table (spec
 * S7 § filters). Keyed by EVERY key of the generated
 * PurchaseOrderLineFilterInput — a definition to expose, `null` to dismiss —
 * so a schema that gains a filter stops this file compiling until we decide.
 *
 * One chip: the item code-or-name search, the table's DEFAULT filter (seeded
 * present-but-empty by the view). It lives in the table's own toolbar, never
 * the page header (ui-standards › tables › toolbar).
 */
const FILTERS: Filter<PurchaseOrderLineFilter>[] =
  constructFilters<PurchaseOrderLineFilter>({
    // ─ user-facing ──────────────────────────────────────────────────────────
    // Labelled for what it MATCHES, as the sibling detail tables do. Blank
    // clears to null so stripEmpty drops it (a blank `like` matches all).
    itemCodeOrName: {
      label: () => t('label.code-or-name'),
      render: props => (
        <FilterTextInput
          label={t('label.code-or-name')}
          testId={props.testId}
          placeholder={t('placeholder.search')}
          value={props.filter().itemCodeOrName?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({
              itemCodeOrName: value ? { like: value } : null,
            })
          }
        />
      ),
    },

    // ─ dismissed (not user-facing) ──────────────────────────────────────────
    // The screen's scope, merged by the view over whatever the user sets.
    purchaseOrderId: null,
    id: null,
    // Narrower than the code-or-name chip above; offering both would be two
    // chips over the same column.
    itemName: null,
    // Order-level keys — every line here shares the one order.
    supplierName: null,
    purchaseOrderNumber: null,
    // The outstanding-lines list's own vocabulary (S5), not this screen's.
    status: null,
    receivedLessThanAdjusted: null,
    expectedDeliveryDate: null,
  });

export const filterFields = (): Filter<PurchaseOrderLineFilter>[] => FILTERS;
