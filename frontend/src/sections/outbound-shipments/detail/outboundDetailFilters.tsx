import { t } from '../../../intl';
import {
  FilterTextInput,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import { LocationSelect, type Location } from '../../../domain/location';
import type { OutboundLineFilter } from './outboundLineFilter';

// Type-driven, EXHAUSTIVE filter definitions for the outbound detail lines,
// mirroring the stocktakes detail (stocktakeDetailFilters.tsx). The map passed
// to constructFilters is keyed by EVERY key of the generated
// InvoiceLineFilterInput: a key maps to a definition to expose it, or `null`
// to dismiss it. Being a Record over all of OutboundLineFilter it can't
// compile with a key missing — when the schema gains a filter, codegen adds
// the key and this map stops compiling until we decide expose-or-dismiss.
//
// The detail table is server-filtered (spec rules.md § server-paginated line
// table), so the only filters offered are the ones the backend supports:
// `itemCodeOrName` (the item search) and `locationId` (an exact-match location
// picker, volume-blind — capacity is irrelevant to narrowing a line list), both
// chips in the table toolbar's FilterBar — the search an ALWAYS-ON default
// filter, Location addable from the filter menu. The filters a user might
// expect from the old app but the server can't do yet — batch and
// expiry-before — are backend gaps (spec contract § detail line table).
export const outboundDetailFilters = (
  locations: () => Location[]
): Filter<OutboundLineFilter>[] =>
  constructFilters<OutboundLineFilter>({
    // ─ user-facing chips, in display order ───────────────────────────────────
    // Item name / code search (server itemCodeOrName.like, OMS-REG-DIST-03.30)
    // — the screen's ALWAYS-ON filter, so it's on the bar regardless and can't
    // be removed (spec S3 § line-table filters: "always-on toolbar search").
    // Blank clears to null so stripEmpty drops it (a blank `like` would match
    // everything).
    itemCodeOrName: {
      alwaysOn: true,
      label: () => t('label.code-or-name'),
      render: props => (
        <FilterTextInput
          label={t('label.code-or-name')}
          // A permanent chip starts empty and shrink-wrapped, so the
          // placeholder is what makes it read as a search box.
          placeholder={t('placeholder.enter-an-item-code-or-name')}
          testId={props.testId}
          value={props.filter().itemCodeOrName?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({
              itemCodeOrName: value ? { like: value } : null,
            })
          }
        />
      ),
    },
    locationId: {
      label: () => t('label.location'),
      render: props => (
        <LocationSelect
          label={t('label.location')}
          hideLabel
          locations={locations()}
          focusTarget={props.focusTarget}
          value={props.filter().locationId?.equalTo ?? undefined}
          placeholder={t('label.location')}
          // Pick a location → filter by its id (server locationId.equalTo);
          // clear (×) → null so stripEmpty drops it (the chip stays).
          onChange={location =>
            props.setPartialFilter({
              locationId: location ? { equalTo: location.id } : null,
            })
          }
        />
      ),
    },

    // ─ dismissed (not addable chips) ─────────────────────────────────────────
    // Fixed scoping the VIEW merges into every query — never user-facing.
    id: null,
    storeId: null,
    invoiceId: null,
    type: null,
    // Backs the status pre-flight count probes, not a user filter.
    numberOfPacks: null,
    // Invoice-level keys — meaningless within one shipment's lines.
    requisitionId: null,
    invoiceType: null,
    invoiceStatus: null,
    verifiedDatetime: null,
    programId: null,
    isProgramInvoice: null,
    // Line keys with no user-facing narrowing story here.
    itemId: null,
    stockLineId: null,
    reasonOption: null,
  });
