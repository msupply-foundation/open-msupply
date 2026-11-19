import { t } from '@/intl';
import {
  FilterTextInput,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import type { ReportFilter } from './reportRegister';

/*
 * Type-driven, EXHAUSTIVE filter definitions for the report register
 * (spec/manage-reports ui-surface.md S1 § filters, OMS-REG-MNG-06.5).
 *
 * Name and code are the ONLY filters offered. The map is keyed by every key of
 * the generated `ReportFilterInput` — a key maps to a definition to expose it,
 * or `null` to dismiss it — so when the schema gains a filter, codegen adds the
 * key and this map stops compiling until we decide expose-or-dismiss.
 *
 * Built once at module load: a stable const, so FilterBar's <For> never
 * remounts a chip on a filter edit (kdd/solid-reactivity-pitfalls § no
 * remounts). Labels are ACCESSORS read in FilterBar's JSX, so they
 * re-translate on a language switch without rebuilding the array.
 */
const FILTERS: Filter<ReportFilter>[] = constructFilters<ReportFilter>({
  // ─ user-facing, in display order ─────────────────────────────────────────
  // Both are contains-matches: StringFilterInput.like is case-insensitive
  // inclusion, which is what the reference app's search-by-name/-code do. An
  // empty box clears the member entirely rather than sending `like: ""`, which
  // would narrow to everything and still count as an active filter.
  name: {
    label: () => t('label.name'),
    render: props => (
      <FilterTextInput
        label={t('label.name')}
        placeholder={t('placeholder.search-by-name')}
        testId={props.testId}
        value={props.filter().name?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({ name: value ? { like: value } : null })
        }
      />
    ),
  },
  code: {
    label: () => t('label.code'),
    render: props => (
      <FilterTextInput
        label={t('label.code')}
        placeholder={t('placeholder.search-by-code')}
        testId={props.testId}
        value={props.filter().code?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({ code: value ? { like: value } : null })
        }
      />
    ),
  },

  // ─ dismissed (not user-facing) ───────────────────────────────────────────
  // ACTIVE STATE IS NOT OFFERED. The wire supports `isActive` and the
  // reference app's column even declares a select for it, but no control is
  // reachable on that screen — so a deactivated version is found by paging,
  // not filtering (rules.md § the register, OMS-REG-MNG-06.5). Captured as-is:
  // exposing it here would be a deliberate difference, not a reverse spec.
  isActive: null,
  // Context / sub-context narrow correctly on the wire but the register shows
  // neither column, so there is nothing for a user to filter toward. Available
  // to any caller that wants them.
  context: null,
  subContext: null,
  // Identity — programmatic, never a user-facing list filter.
  id: null,
});

export const filterFields = (): Filter<ReportFilter>[] => FILTERS;
