import { PropertyNodeValueType, CustomFieldNodeValueType } from '@common/types';
import { toLegacyPropertyInput } from './customFieldAdapter';

describe('toLegacyPropertyInput', () => {
  it('maps editable V2 types to the legacy PropertyInput types', () => {
    expect(toLegacyPropertyInput(CustomFieldNodeValueType.Text)).toEqual({
      valueType: PropertyNodeValueType.String,
    });
    expect(toLegacyPropertyInput(CustomFieldNodeValueType.Integer)).toEqual({
      valueType: PropertyNodeValueType.Integer,
    });
    expect(toLegacyPropertyInput(CustomFieldNodeValueType.Real)).toEqual({
      valueType: PropertyNodeValueType.Float,
    });
    expect(toLegacyPropertyInput(CustomFieldNodeValueType.Date)).toEqual({
      valueType: PropertyNodeValueType.Date,
    });
    expect(toLegacyPropertyInput(CustomFieldNodeValueType.Boolean)).toEqual({
      valueType: PropertyNodeValueType.Boolean,
    });
  });

  it('returns null (render read-only) for OPTION', () => {
    // OPTION values are ids; the legacy control is name-based, so editing is
    // deferred to a follow-up id-aware control.
    expect(toLegacyPropertyInput(CustomFieldNodeValueType.Option)).toBeNull();
  });
});
