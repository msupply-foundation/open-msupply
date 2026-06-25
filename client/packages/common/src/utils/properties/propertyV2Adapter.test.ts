import { PropertyNodeValueType, PropertyNodeValueTypeV2 } from '@common/types';
import { toLegacyPropertyInput } from './propertyV2Adapter';

describe('toLegacyPropertyInput', () => {
  it('maps editable V2 types to the legacy PropertyInput types', () => {
    expect(toLegacyPropertyInput(PropertyNodeValueTypeV2.Text)).toEqual({
      valueType: PropertyNodeValueType.String,
    });
    expect(toLegacyPropertyInput(PropertyNodeValueTypeV2.Integer)).toEqual({
      valueType: PropertyNodeValueType.Integer,
    });
    expect(toLegacyPropertyInput(PropertyNodeValueTypeV2.Real)).toEqual({
      valueType: PropertyNodeValueType.Float,
    });
    expect(toLegacyPropertyInput(PropertyNodeValueTypeV2.Date)).toEqual({
      valueType: PropertyNodeValueType.Date,
    });
    expect(toLegacyPropertyInput(PropertyNodeValueTypeV2.Boolean)).toEqual({
      valueType: PropertyNodeValueType.Boolean,
    });
  });

  it('returns null (render read-only) for OPTION', () => {
    // OPTION values are ids; the legacy control is name-based, so editing is
    // deferred to a follow-up id-aware control.
    expect(toLegacyPropertyInput(PropertyNodeValueTypeV2.Option)).toBeNull();
  });
});
