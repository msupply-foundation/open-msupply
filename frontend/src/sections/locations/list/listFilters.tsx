import { t } from '@/intl';
import {
  FilterTextInput,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import { Checkbox } from '@/ui/elements/inputs/Checkbox';
import type { LocationsListVariables } from './locations.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no
// remapping — this is the generated variables' filter shape). It flows straight
// through the FilterBar; there is no parallel value model and no mapper.
export type LocationFilter = NonNullable<LocationsListVariables['filter']>;

/*
 * Type-driven, EXHAUSTIVE filter definitions for the locations list
 * (spec/locations S1 § filters, OMS-REG-INV-01.14): Name and Code as
 * text-contains, On hold as a checkbox — checked narrows to on-hold locations,
 * unchecked applies no filter (no "not on hold" filter exists). The map is
 * keyed by EVERY key of the generated LocationFilterInput: a key maps to a
 * definition to expose it, or `null` to dismiss it — when the schema gains a
 * filter, codegen adds the key and this map stops compiling until we decide
 * expose-or-dismiss (the reference vertical's pattern, see
 * stocktakes/listFilters).
 *
 * Built once at module load — a stable const, so FilterBar's <For> never
 * remounts a chip on a filter edit (kdd/solid-reactivity-pitfalls § no
 * remounts). Labels are ACCESSORS read in FilterBar's JSX, so they
 * re-translate on a language switch without rebuilding the array.
 */
const FILTERS: Filter<LocationFilter>[] = constructFilters<LocationFilter>({
  // ─ user-facing, in display order ─────────────────────────────────────────
  name: {
    label: () => t('label.name'),
    render: props => (
      <FilterTextInput
        label={t('label.name')}
        testId={props.testId}
        placeholder={t('label.name')}
        value={props.filter().name?.like ?? ''}
        // Blank box → null, never { like: '' }: an empty `like` would wrongly
        // match (the server treats "" as a real substring).
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
        testId={props.testId}
        placeholder={t('label.code')}
        value={props.filter().code?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({ code: value ? { like: value } : null })
        }
      />
    ),
  },
  onHold: {
    label: () => t('label.on-hold'),
    render: props => (
      <Checkbox
        // The labelled Checkbox, not FilterCheckbox — a control from outside
        // FilterBar, so the chip's focus target is bound by hand here.
        label={t('label.on-hold')}
        testId={props.testId}
        focusTarget={props.focusTarget}
        checked={props.filter().onHold === true}
        // Checked → only on-hold locations; unchecked → null (the chip stays,
        // added-but-empty) — there is no "not on hold" filter (spec/locations
        // S1 § filters). A discrete choice applies immediately (ui-standards/
        // inputs.md § server-bound input).
        onChange={checked =>
          props.setPartialFilter({ onHold: checked ? true : null })
        }
      />
    ),
  },

  // ─ dismissed (not user-facing) ───────────────────────────────────────────
  // Combined code-or-name search — the list offers the two separate text
  // filters the spec names; the combined operator is for pickers.
  codeOrName: null,
  // Asset-module scoping — programmatic, not a user-facing list filter.
  assignedToAsset: null,
  // Identity / relational filters — programmatic. The list is store-scoped by
  // the query's own storeId argument (OMS-REG-INV-01.36), not a user-facing
  // filter.
  storeId: null,
  id: null,
  locationTypeId: null,
});

export const filterFields = (): Filter<LocationFilter>[] => FILTERS;
