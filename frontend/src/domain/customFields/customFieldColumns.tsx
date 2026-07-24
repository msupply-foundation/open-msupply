import type { Column } from '../../ui/elements/table/columnTypes';
import {
  parseCustomField,
  shownCustomFields,
  type CustomFieldDef,
} from './parse';
import { customFieldDisplayString } from './display';

// The configured custom-field COLUMNS for a list (spec/ui-standards/custom-fields
// › lists): one non-sortable display column per shown field, its cell the
// value's display string (option → resolved name, number/date → localised,
// boolean → check mark). Generic over the row type — the caller supplies how to
// read the row's raw `customFields` value. Empty when nothing is configured.
export const customFieldColumns = <T, K extends string>(
  defs: CustomFieldDef[],
  getRaw: (row: T) => unknown
): Column<T, K>[] =>
  shownCustomFields(defs).map((def): Column<T, K> => {
    const field = parseCustomField(def);
    return {
      c: { id: `cf-${def.key}` },
      header: def.name,
      enableSorting: false,
      cell: info => customFieldDisplayString(field, getRaw(info.row.original)),
    };
  });
