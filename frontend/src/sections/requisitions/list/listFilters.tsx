import { t } from '@/intl';
import {
  FilterTextInput,
  FilterNumberInput,
  FilterSelect,
  FilterMultiSelect,
  FilterDateRange,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import { localTodayIso } from '@/ui/elements/inputs/dateTimeConvert';
import type { RequisitionsVariables } from './requisitions.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety — no
// remapping; the generated variables' filter shape flows straight through
// FilterBar). Mirrors the internal-orders list-filter pattern. `type` (pinned
// to RESPONSE) is NOT part of this state: it is a constant added at
// query-build time (see RequisitionsList), never a user control.
export type RequisitionFilter = NonNullable<RequisitionsVariables['filter']>;

/*
 * Type-driven, EXHAUSTIVE filter definitions for the requisitions list
 * (spec/requisitions S1 → filters). The map is keyed by EVERY key of the
 * generated RequisitionFilterInput: a key maps to a definition to expose it,
 * or `null` to dismiss it (not user-facing). Being a Record over all of
 * RequisitionFilter, it can't compile with a key missing — when the schema
 * gains a filter, codegen adds the key and this map stops compiling until we
 * decide expose-or-dismiss. Nothing is exposed by accident, and this single
 * map is BOTH the definitions and the completeness proof. The map's key order
 * IS the toolbar's display order (exposed filters come first).
 *
 * Built once, at module load — a stable const, so FilterBar's <For> never
 * remounts a chip on a filter edit. Safe despite the t()-driven labels because
 * each `label` is an ACCESSOR read in FilterBar's JSX, so the array needn't be
 * rebuilt to re-translate on a language switch. The emergency filter's
 * programs-module gate (OMS-REG-DIST-05.24) is applied by filterFields()
 * FILTERING this stable array — surviving items keep their identity, so the
 * gate resolving adds a chip without remounting the others.
 */
const FILTERS: Filter<RequisitionFilter>[] =
  constructFilters<RequisitionFilter>({
    // ─ user-facing, in display order ────────────────────────────────────────
    // Name — customer name, contains (case-insensitive) → StringFilter.like.
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
    // Requisition number — equals → EqualFilterBigNumberInput.equalTo.
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
    // Status — multi-select "any of" (D110; New / Finalised — the response
    // side's whole vocabulary; DRAFT and SENT are request-side only and never
    // offered, unlike the reference's stray column filter, captured as-is in
    // the spec). Ticks accumulate into status.equalAny; none → null so the
    // chip stays.
    status: {
      label: () => t('label.status'),
      render: props => (
        <FilterMultiSelect
          label={t('label.status')}
          testId={props.testId}
          placeholder={t('label.any')}
          values={props.filter().status?.equalAny ?? []}
          options={[
            { value: 'NEW', label: t('label.new') },
            { value: 'FINALISED', label: t('label.finalised') },
          ]}
          onChange={values =>
            props.setPartialFilter({
              status: values.length ? { equalAny: values } : null,
            })
          }
        />
      ),
    },
    // Shipment created — yes/no over the plain Boolean filter field. A
    // three-way select (Any / Yes / No): the wire value is the boolean itself,
    // carried as its string form in the select.
    aShipmentHasBeenCreated: {
      label: () => t('label.shipment-created'),
      render: props => (
        <FilterSelect
          label={t('label.shipment-created')}
          testId={props.testId}
          value={
            props.filter().aShipmentHasBeenCreated == null
              ? ''
              : String(props.filter().aShipmentHasBeenCreated)
          }
          options={[
            { value: '', label: t('label.any') },
            { value: 'true', label: t('messages.yes') },
            { value: 'false', label: t('messages.no') },
          ]}
          onChange={value =>
            props.setPartialFilter({
              aShipmentHasBeenCreated: value === '' ? null : value === 'true',
            })
          }
        />
      ),
    },
    // Emergency — yes/no; offered only where the store runs the programs
    // module (OMS-REG-DIST-05.24 — the reference app's gate). The gate is
    // applied in filterFields().
    isEmergency: {
      label: () => t('label.emergency'),
      render: props => (
        <FilterSelect
          label={t('label.emergency')}
          testId={props.testId}
          value={
            props.filter().isEmergency == null
              ? ''
              : String(props.filter().isEmergency)
          }
          options={[
            { value: '', label: t('label.any') },
            { value: 'true', label: t('messages.yes') },
            { value: 'false', label: t('messages.no') },
          ]}
          onChange={value =>
            props.setPartialFilter({
              isEmergency: value === '' ? null : value === 'true',
            })
          }
        />
      ),
    },
    // Created — DateTime field; FilterDateRange (type="dateTime") owns the
    // local ⇄ UTC conversion (#456). ([D15] — the reference app exposes no
    // created-range control; this is the divergence target.)
    createdDatetime: {
      label: () => t('label.created'),
      render: props => (
        <FilterDateRange
          type="dateTime"
          label={t('label.created')}
          testId={props.testId}
          max={localTodayIso()}
          value={props.filter().createdDatetime}
          onChange={value => props.setPartialFilter({ createdDatetime: value })}
        />
      ),
    },

    // ─ dismissed (not user-facing) ──────────────────────────────────────────
    // `type` is pinned to RESPONSE at query-build time (contract ›
    // "Requisitions only"), never a user control.
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
    automaticallyCreated: null,
    isProgramRequisition: null,
    hasOutstandingLines: null,
  });

// The list's filters, with the emergency filter's store-context gate applied
// (OMS-REG-DIST-05.24: the programs-module store preference): filtering the
// stable const keeps every surviving chip's identity, so the gate resolving
// never remounts the bar.
export const filterFields = (
  showEmergency: boolean
): Filter<RequisitionFilter>[] =>
  showEmergency ? FILTERS : FILTERS.filter(f => f.key !== 'isEmergency');
