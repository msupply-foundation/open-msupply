import { t } from '../../../intl';
import {
  FilterTextInput,
  FilterNumberInput,
  FilterSelect,
  FilterDateRange,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import type { InternalOrdersVariables } from './internalOrders.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety — no
// remapping; the generated variables' filter shape flows straight through
// FilterBar). Mirrors the stocktakes / inbound-shipments list-filter pattern.
// `type` (pinned to REQUEST) is NOT part of this state: it is a constant added
// at query-build time (see InternalOrdersList), never a user control.
export type InternalOrderFilter = NonNullable<
  InternalOrdersVariables['filter']
>;

/*
 * Type-driven, EXHAUSTIVE filter definitions for the internal-orders list
 * (spec/internal-orders S1 → filters). The map is keyed by EVERY key of the
 * generated RequisitionFilterInput: a key maps to a definition to expose it, or
 * `null` to dismiss it (not user-facing). Being a Record over all of
 * InternalOrderFilter, it can't compile with a key missing — when the schema
 * gains a filter, codegen adds the key and this map stops compiling until we
 * decide expose-or-dismiss. Nothing is exposed by accident, and this single map
 * is BOTH the definitions and the completeness proof. The map's key order IS
 * the toolbar's display order (exposed filters come first).
 *
 * Built once, at module load — a stable const, so FilterBar's <For> never
 * remounts a chip on a filter edit. Safe despite the t()-driven labels because
 * each `label` is an ACCESSOR read in FilterBar's JSX, so the array needn't be
 * rebuilt to re-translate on a language switch.
 */
const FILTERS: Filter<InternalOrderFilter>[] =
  constructFilters<InternalOrderFilter>({
    // ─ user-facing, in display order ────────────────────────────────────────
    // Name — supplier name, contains (case-insensitive) → StringFilter.like.
    otherPartyName: {
      label: () => t('label.name'),
      render: props => (
        <FilterTextInput
          label={t('label.name')}
          testId={props.testId}
          placeholder={t('placeholder.search')}
          value={props.filter().otherPartyName?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({
              otherPartyName: value ? { like: value } : null,
            })
          }
        />
      ),
    },
    // Requisition (order) number — equals → EqualFilterBigNumberInput.equalTo.
    requisitionNumber: {
      label: () => t('label.requisition-number'),
      render: props => (
        <FilterNumberInput
          label={t('label.requisition-number')}
          testId={props.testId}
          placeholder={t('placeholder.search')}
          value={props.filter().requisitionNumber?.equalTo ?? undefined}
          onChange={value =>
            props.setPartialFilter({
              requisitionNumber:
                value === undefined ? null : { equalTo: value },
            })
          }
        />
      ),
    },
    // Status — single-select equals (Draft / Sent / Finalised). '' clears (→
    // null so the chip stays); the value is one of the enum literals, so no
    // cast is needed.
    status: {
      label: () => t('label.status'),
      render: props => (
        <FilterSelect
          label={t('label.status')}
          testId={props.testId}
          value={props.filter().status?.equalTo ?? ''}
          options={[
            { value: '', label: t('label.any') },
            { value: 'DRAFT', label: t('label.draft') },
            { value: 'SENT', label: t('label.sent') },
            { value: 'FINALISED', label: t('label.finalised') },
          ]}
          onChange={value =>
            props.setPartialFilter({
              status: value ? { equalTo: value } : null,
            })
          }
        />
      ),
    },
    // Created — DateTime field; FilterDateRange (type="dateTime") owns the
    // local ⇄ UTC conversion (#456). ([D13] — the reference app exposes no
    // created-range control; this is the divergence target.)
    createdDatetime: {
      label: () => t('label.created'),
      render: props => (
        <FilterDateRange
          type="dateTime"
          label={t('label.created')}
          testId={props.testId}
          value={props.filter().createdDatetime}
          onChange={value => props.setPartialFilter({ createdDatetime: value })}
        />
      ),
    },

    // ─ dismissed (not user-facing) ──────────────────────────────────────────
    // `type` is pinned to REQUEST at query-build time (contract › "Internal
    // orders only"), never a user control.
    type: null,
    // Identity / relational / programmatic filters.
    id: null,
    userId: null,
    otherPartyId: null,
    colour: null,
    programId: null,
    periodId: null,
    elmisCode: null,
    // Datetime / date fields not surfaced as list controls.
    sentDatetime: null,
    finalisedDatetime: null,
    expectedDeliveryDate: null,
    // Text fields the schema declares but the list does not filter on.
    theirReference: null,
    comment: null,
    orderType: null,
    // Booleans the schema exposes, not surfaced on this list.
    aShipmentHasBeenCreated: null,
    isEmergency: null,
    automaticallyCreated: null,
    isProgramRequisition: null,
    hasOutstandingLines: null,
  });

export const filterFields = (): Filter<InternalOrderFilter>[] => FILTERS;
