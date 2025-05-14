import React, { useState } from 'react';
import {
  noOtherVariants,
  PreferenceValueNodeType,
  Switch,
  isBoolean,
  isNumber,
  UpsertPreferencesInput,
  PreferenceDescriptionNode,
  useTranslation,
} from '@openmsupply-client/common';

export const EditPreference = ({
  preference,
  update,
  disabled = false,
}: {
  preference: PreferenceDescriptionNode;
  update: (input: UpsertPreferencesInput[keyof UpsertPreferencesInput]) => void;
  disabled?: boolean;
}) => {
  const t = useTranslation();

  // The preference.value only updates after mutation completes and cache
  // is invalidated - use local state for fast UI change
  const [value, setValue] = useState(preference.value);

  switch (preference.valueType) {
    case PreferenceValueNodeType.Boolean:
      if (!isBoolean(value)) {
        return t('error.something-wrong');
      }
      return (
        <Switch
          disabled={disabled}
          checked={value}
          onChange={(_, checked) => {
            setValue(checked);
            update(checked);
          }}
        />
      );

    case PreferenceValueNodeType.Integer:
      if (!isNumber(preference.value)) {
        return t('error.something-wrong');
      }
      // Adding NumericTextInput here would currently get a type error,
      // because there are no editPreference inputs that accept a number
      return <>To be implemented</>;

    default:
      noOtherVariants(preference.valueType);
  }
};
