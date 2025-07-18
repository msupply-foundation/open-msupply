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
  TextArea,
} from '@openmsupply-client/common';
import {
  EnumOptions,
  getEnumPreferenceOptions,
} from '../Components/EnumOptions';

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
  const { error } = useNotification();

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
            update(newValue);
          }}
        />
      );

    case PreferenceValueNodeType.CustomTranslations:
      return (
        <TextArea
          onChange={e => {
            const newValue = e.target.value;
            JSON.parse(newValue); // Validate JSON format

            setValue(newValue);
            update(newValue);
          }}
          value={JSON.stringify(value, null, 2)}
          maxRows={10}
          minRows={10}
          style={{ padding: '0 0 0 50px' }}
          slotProps={{
            input: {
              sx: {
                border: theme => `1px solid ${theme.palette.gray.main}`,
                borderRadius: '5px',
                padding: '3px',
              },
            },
          }}
        />
      );

    default:
      try {
        noOtherVariants(preference.valueType);
      } catch (e) {
        error((e as Error).message)();
      }
  }
};
