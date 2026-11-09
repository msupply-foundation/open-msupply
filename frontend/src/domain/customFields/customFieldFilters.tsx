import type { Filter } from '../../ui/elements/selectors/FilterBar';
import {
  parseCustomField,
  shownCustomFields,
  type CustomFieldDef,
} from './parse';
import { CustomFieldFilterControl } from './CustomFieldFilterControl';
import type { CustomFieldFilterState } from './filter';

export type { CustomFieldFilterState } from './filter';

// The custom-field group for a list's FilterBar
// (spec/ui-standards/custom-fields › lists): one add-a-filter entry per
// configured field, each rendering the TYPED control for its value kind
// (CustomFieldFilterControl). `unsupported` fields are dropped (no sensible
// filter). Passed to FilterBar as its `extra` group so custom-field filters
// share the one filter menu + chip row.
export const customFieldFilters = (
  defs: CustomFieldDef[]
): Filter<CustomFieldFilterState>[] =>
  shownCustomFields(defs)
    .map(parseCustomField)
    .filter(field => field.kind !== 'unsupported')
    .map(field => ({
      key: field.def.key,
      label: () => field.def.name,
      render: props => (
        <CustomFieldFilterControl
          field={field}
          value={props.filter()[field.def.key] ?? null}
          onChange={value => props.setPartialFilter({ [field.def.key]: value })}
          testId={props.testId}
        />
      ),
    }));
