import { t } from '@/intl';
import {
  FilterDateRange,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import { localTodayIso } from '@/ui/elements/inputs/dateTimeConvert';
import type { RnrFormsVariables } from './rnrForms.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no
// remapping — this is the generated variables' filter shape). It flows
// straight through the FilterBar; there is no parallel value model.
export type RnrFormFilter = NonNullable<RnrFormsVariables['filter']>;

/*
 * Type-driven, EXHAUSTIVE filter definitions for the R&R forms list
 * (spec/rnr-forms/ui-surface.md S1 § filters). The map is keyed by EVERY key
 * of the generated RnRFormFilterInput: a key maps to a definition to expose
 * it, or `null` to dismiss it (not user-facing). Being a Record over all of
 * RnrFormFilter, it can't compile with a key missing — when the schema gains
 * a filter, codegen adds the key and this map stops compiling until we decide
 * expose-or-dismiss. The map's key order IS the toolbar's display order.
 *
 * Built once, at module load — a stable const, so FilterBar's <For> never
 * remounts a chip on a filter edit. Safe despite the t()-driven labels
 * because each `label` is an ACCESSOR read in FilterBar's JSX.
 */
const FILTERS: Filter<RnrFormFilter>[] = constructFilters<RnrFormFilter>({
  // ─ user-facing, in display order ─────────────────────────────────────────
  // Created — DateTime field; FilterDateRange (type="dateTime") owns the
  // local ⇄ UTC conversion (#456).
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

  // ─ dismissed (not user-facing) ───────────────────────────────────────────
  // Identity / relational / programmatic filters, per the sibling lists
  // (stocktakes and internal-orders both dismiss programId the same way);
  // storeId is pinned at query-build time, and periodScheduleId is the create
  // modal's sequence anchor, not a list control.
  id: null,
  storeId: null,
  programId: null,
  periodScheduleId: null,
});

export const filterFields = (): Filter<RnrFormFilter>[] => FILTERS;
