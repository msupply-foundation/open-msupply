import { t } from '@/intl';
import {
  FilterTextInput,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import type { ProgramFilter } from './programRegister';

/*
 * Type-driven, EXHAUSTIVE filter definitions for the program list
 * (spec/immunisation-programs ui-surface S1 § filters): one user-facing
 * filter, Program name (a case-insensitive contains — `name.like`, which the
 * server honours as such). Every other key of the generated
 * `ProgramFilterInput` is dismissed here with `null`, so when the schema gains
 * a filter this map stops compiling until it is exposed or dismissed on
 * purpose. `isImmunisation` in particular is NOT a user filter: the list forces
 * it true on every read (programRegister.ts).
 *
 * Built once, at module load — a stable const, so FilterBar's <For> never
 * remounts the chip on an edit; the label is an accessor so it still
 * re-translates on a language switch.
 */
const FILTERS: Filter<ProgramFilter>[] = constructFilters<ProgramFilter>({
  name: {
    label: () => t('label.program-name'),
    render: props => (
      <FilterTextInput
        label={t('label.program-name')}
        testId={props.testId}
        placeholder={t('placeholder.search')}
        value={props.filter().name?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({ name: value ? { like: value } : null })
        }
      />
    ),
  },
  // ─ dismissed: not user-facing on this list ─
  id: null,
  contextId: null,
  isImmunisation: null,
  existsForStoreId: null,
  elmisCode: null,
  itemId: null,
});

export const filterFields = (): Filter<ProgramFilter>[] => FILTERS;
