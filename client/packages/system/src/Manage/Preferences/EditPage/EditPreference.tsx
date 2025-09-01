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
  ) => Promise<boolean>;
  disabled?: boolean;
}) => {
  const t = useTranslation();
  const { error } = useNotification();

  // The preference.value only updates after mutation completes and cache
  // is invalidated - use local state for fast UI change
  const [value, setValue] = useState(preference.value);

  const debouncedUpdate = useDebouncedValueCallback(
    async value => {
      const success = await update(value);

      if (!success) {
        // If update fails, revert to original value
        setValue(preference.value);
      }
    },
    [],
    350
  );

  const handleChange = (newValue: PreferenceDescriptionNode['value']) => {
    setValue(newValue);
    debouncedUpdate(newValue);
  };

  switch (preference.valueType) {
    case PreferenceValueNodeType.Boolean:
      if (!isBoolean(value)) {
        return t('error.something-wrong');
      }
      return (
        <Switch
          disabled={disabled}
          checked={value}
          onChange={(_, checked) => handleChange(checked)}
        />
      );

    case PreferenceValueNodeType.Integer:
      if (!isNumber(preference.value)) {
        return t('error.something-wrong');
      }
      return <NumericTextInput value={value} onChange={handleChange} />;

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
          onChange={handleChange}
        />
      );

    case PreferenceValueNodeType.CustomTranslations:
      return (
        // Pass API value/update directly - called on modal save rather than on each key stroke/click
        <EditCustomTranslations value={preference.value} update={update} />
      );

    default:
      try {
        noOtherVariants(preference.valueType);
      } catch (e) {
        error((e as Error).message)();
      }
  }
};
