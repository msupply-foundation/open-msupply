import { t } from '../../../intl';
import {
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
// table), so the only filters offered are the ones the backend supports.
// `itemCodeOrName` is the always-on item search rendered by the toolbar (not a
// chip); `locationId` is the one addable chip (exact-match location picker,
// volume-blind — capacity is irrelevant to narrowing a line list). The
// filters a user might expect from the old app but the server can't do yet —
// batch and expiry-before — are backend gaps (spec contract § detail line
// table).
export const outboundDetailFilters = (
  locations: () => Location[]
): Filter<OutboundLineFilter>[] =>
  constructFilters<OutboundLineFilter>({
    // ─ user-facing (addable chips), in display order ─────────────────────────
    locationId: {
      label: () => t('label.location'),
      render: props => (
        <LocationSelect
          label={t('label.location')}
          hideLabel
          locations={locations()}
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
    // The always-on item search (name OR code) — rendered by the toolbar, not
    // as a chip.
    itemCodeOrName: null,
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
