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
  LocaleKey,
} from '@openmsupply-client/common';
import {
  EnumOptions,
  getEnumPreferenceOptions,
} from '../Components/EnumOptions';
import { EditCustomTranslations } from '../Components/CustomTranslations/CustomTranslationsModal';
import { EditWarningWhenMissingRecentStocktakeData } from '../Components/EditWarningWhenMissingRecentStocktakeData';
import { PreferenceLabelRow } from './PreferenceLabelRow';

interface EditPreferenceProps {
  preference: PreferenceDescriptionNode;
  update: (
    input: UpsertPreferencesInput[keyof UpsertPreferencesInput]
  ) => Promise<boolean>;
  disabled?: boolean;
  label?: string;
  sx?: Record<string, unknown>;
}

export const EditPreference = ({
  preference,
  update,
  disabled = false,
  label,
  sx,
}: EditPreferenceProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const preferenceLabel =
    label ?? t(`preference.${preference.key}` as LocaleKey);

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
        <PreferenceLabelRow
          label={preferenceLabel}
          Input={
            <Switch
              disabled={disabled}
              checked={value}
              onChange={(_, checked) => handleChange(checked)}
            />
          }
          sx={sx}
        />
      );

    case PreferenceValueNodeType.Integer:
      if (!isNumber(preference.value)) {
        return t('error.something-wrong');
      }
      return (
        <PreferenceLabelRow
          label={preferenceLabel}
          Input={
            <NumericTextInput
              value={value}
              onChange={handleChange}
              onBlur={() => {}}
            />
          }
          sx={sx}
        />
      );

    case PreferenceValueNodeType.MultiChoice:
      if (!Array.isArray(value)) {
        return t('error.something-wrong');
      }
      const options = getEnumPreferenceOptions(t, preference.key);

      return (
        <PreferenceLabelRow
          label={preferenceLabel}
          Input={
            <EnumOptions
              disabled={disabled}
              options={options}
              value={value}
              onChange={handleChange}
            />
          }
          sx={sx}
        />
      );

    case PreferenceValueNodeType.CustomTranslations:
      return (
        <PreferenceLabelRow
          label={preferenceLabel}
          Input={
            // Pass API value/update directly - called on modal save rather than on each key stroke/click
            <EditCustomTranslations value={preference.value} update={update} />
          }
          sx={sx}
        />
      );

    case PreferenceValueNodeType.WarnWhenMissingRecentStocktakeData:
      // This component has its own Accordion wrapper and complex layout
      return (
        <EditWarningWhenMissingRecentStocktakeData
          value={value}
          update={handleChange}
          disabled={disabled}
          label={preferenceLabel}
          sx={sx}
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
