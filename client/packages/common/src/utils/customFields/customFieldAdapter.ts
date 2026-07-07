import { PropertyNodeValueType, CustomFieldNodeValueType } from '@common/types';

/**
 * Bridge a customFields value type to the legacy `PropertyInput` control's
 * `PropertyNodeValueType` (+ `allowedValues`).
 *
 * `PropertyInput` predates customFields and speaks the legacy enum
 * (Boolean/Integer/Float/Date/String) with options as a flat `string[]`. The
 * V2 enum is richer (INTEGER/REAL split, OPTION carrying `{id,name}` objects),
 * so the two don't line up 1:1.
 *
 * Returns `null` for value types that don't map to the legacy control:
 *  - `OPTION`: handled directly by `CustomFieldInput` via an id-aware
 *    Autocomplete (the legacy control is name/string based and would corrupt the
 *    stored id), so it never routes through this bridge.
 *
 * This keeps the V2→legacy mapping in one place so the edit control itself is
 * untouched (it's shared with the Stores properties UI).
 */
export const toLegacyPropertyInput = (
  valueType: CustomFieldNodeValueType
): { valueType: PropertyNodeValueType } | null => {
  switch (valueType) {
    case CustomFieldNodeValueType.Text:
      return { valueType: PropertyNodeValueType.String };
    case CustomFieldNodeValueType.Integer:
      return { valueType: PropertyNodeValueType.Integer };
    case CustomFieldNodeValueType.Real:
      return { valueType: PropertyNodeValueType.Float };
    case CustomFieldNodeValueType.Date:
      return { valueType: PropertyNodeValueType.Date };
    case CustomFieldNodeValueType.Boolean:
      return { valueType: PropertyNodeValueType.Boolean };
    case CustomFieldNodeValueType.Option:
    default:
      return null;
  }
};
