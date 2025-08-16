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
  useNotification,
  NumericTextInput,
  useDebouncedValueCallback,
} from '@openmsupply-client/common';
import {
  EnumOptions,
  getEnumPreferenceOptions,
} from '../Components/EnumOptions';
import { EditCustomTranslations } from '../Components/CustomTranslations/CustomTranslationsModal';

export const EditPreference = ({
  preference,
  update,
  disabled = false,
}: {
  preference: PreferenceDescriptionNode;
  update: (
    input: UpsertPreferencesInput[keyof UpsertPreferencesInput]
  ) => Promise<void>;
  disabled?: boolean;
}) => {
  const t = useTranslation();
  const { error } = useNotification();

  // The preference.value only updates after mutation completes and cache
  // is invalidated - use local state for fast UI change
  const [value, setValue] = useState(preference.value);

  const debouncedUpdate = useDebouncedValueCallback(
    value => {
      setValue(value);
      update(value);
    },
    [],
    350
  );

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
            debouncedUpdate(checked);
          }}
        />
      );

    case PreferenceValueNodeType.Integer:
      if (!isNumber(preference.value)) {
        return t('error.something-wrong');
      }
      return (
        <NumericTextInput
          value={value}
          onChange={newValue => {
            setValue(newValue);
            debouncedUpdate(newValue);
          }}
        />
      );

    case PreferenceValueNodeType.MultiChoice:
      if (!Array.isArray(value)) {
        return t('error.something-wrong');
      }
      const options = getEnumPreferenceOptions(t, preference.key);

      return (
        <EnumOptions
          disabled={disabled}
          options={options}
          value={value}
          onChange={newValue => {
            setValue(newValue);
            debouncedUpdate(newValue);
          }}
        />
      );

    case PreferenceValueNodeType.CustomTranslations:
      // Pass update directly - called on modal save than on each key stroke/click
      return <EditCustomTranslations value={value} update={update} />;

    default:
      try {
        noOtherVariants(preference.valueType);
      } catch (e) {
        error((e as Error).message)();
      }
  }
};
