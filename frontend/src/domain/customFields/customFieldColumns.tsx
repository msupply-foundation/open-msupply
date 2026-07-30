import type { Column } from '../../ui/elements/table/columnTypes';
import {
  parseCustomField,
  shownCustomFields,
  type CustomFieldDef,
} from './parse';
import { customFieldDisplayString } from './display';

// The configured custom-field COLUMNS for a list
// (spec/ui-standards/custom-fields › lists): one non-sortable display column
// per shown field, its cell the value's display string (option → resolved name,
// number/date → localised, boolean → check mark). Generic over the row type —
// the caller supplies how to read the row's raw `customFields` value. Empty
// when nothing is configured.
//
// `cardGroup` routes every generated column into one card body group — a
// deployment can configure a dozen fields, and on a phone card they belong
// behind one disclosure rather than flat among the record's own facts
// (docs/CARD_TABLE_MODEL.md). Omit it and the columns land in the always-shown
// default group, which is right for a list whose card has no groups at all.
export const customFieldColumns = <
  T,
  K extends string,
  G extends string = never,
>(
  defs: CustomFieldDef[],
  getRaw: (row: T) => unknown,
  cardGroup?: G
): Column<T, K, G>[] =>
  shownCustomFields(defs).map((def): Column<T, K, G> => {
    const field = parseCustomField(def);
    return {
      c: { id: `cf-${def.key}` },
      header: () => def.name,
      enableSorting: false,
      cardGroup,
      cell: info => customFieldDisplayString(field, getRaw(info.row.original)),
    };
  });
