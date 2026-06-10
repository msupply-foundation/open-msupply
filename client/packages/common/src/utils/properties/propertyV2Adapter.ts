import { PropertyNodeValueType, PropertyNodeValueTypeV2 } from '@common/types';

/**
 * Bridge a propertiesV2 value type to the legacy `PropertyInput` control's
 * `PropertyNodeValueType` (+ `allowedValues`).
 *
 * `PropertyInput` predates propertiesV2 and speaks the legacy enum
 * (Boolean/Integer/Float/Date/String) with options as a flat `string[]`. The
 * V2 enum is richer (NUMBER/REAL split, OPTION carrying `{id,name}` objects,
 * plus an `OTHER` forwards-compat catch-all), so the two don't line up 1:1.
 *
 * Returns `null` for value types that don't map to the legacy control:
 *  - `OPTION`: handled directly by `PropertyV2Input` via an id-aware
 *    Autocomplete (the legacy control is name/string based and would corrupt the
 *    stored id), so it never routes through this bridge.
 *  - `OTHER`: an unrecognised future type; treat as opaque (read-only text).
 *
 * This keeps the V2→legacy mapping in one place so the edit control itself is
 * untouched (it's shared with the Stores properties UI).
 */
export const toLegacyPropertyInput = (
  valueType: PropertyNodeValueTypeV2
): { valueType: PropertyNodeValueType } | null => {
  switch (valueType) {
    case PropertyNodeValueTypeV2.Text:
      return { valueType: PropertyNodeValueType.String };
    case PropertyNodeValueTypeV2.Number:
      return { valueType: PropertyNodeValueType.Integer };
    case PropertyNodeValueTypeV2.Real:
      return { valueType: PropertyNodeValueType.Float };
    case PropertyNodeValueTypeV2.Date:
      return { valueType: PropertyNodeValueType.Date };
    case PropertyNodeValueTypeV2.Boolean:
      return { valueType: PropertyNodeValueType.Boolean };
    case PropertyNodeValueTypeV2.Option:
    case PropertyNodeValueTypeV2.Other:
    default:
      return null;
  }
};
