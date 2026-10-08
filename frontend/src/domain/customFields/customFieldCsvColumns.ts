import {
  parseCustomField,
  shownCustomFields,
  type CustomFieldDef,
} from './parse';
import { customFieldDisplayString } from './display';

// The configured custom-field columns for a list EXPORT
// (spec/ui-standards/list-views § regions: a list's export is its column set).
// The CSV twin of `customFieldColumns` — same shown set, same order, same
// display string — so a deployment's fields reach the file exactly as they read
// on screen rather than being silently dropped. Empty when nothing is
// configured, in which case the export is unchanged.
export interface CustomFieldCsvColumns {
  /** The header cells, appended after the list's own. */
  fields: string[];
  /** A row's cells, from its raw `customFields` value — same length/order. */
  values: (raw: unknown) => string[];
}

export const customFieldCsvColumns = (
  defs: CustomFieldDef[] | undefined
): CustomFieldCsvColumns => {
  const shown = shownCustomFields(defs).map(def => ({
    def,
    field: parseCustomField(def),
  }));
  return {
    fields: shown.map(({ def }) => def.name),
    values: raw =>
      shown.map(({ field }) => customFieldDisplayString(field, raw)),
  };
};
