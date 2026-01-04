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
  BasicTextInput,
  isString,
} from '@openmsupply-client/common';
import { MultiChoice, getMultiChoiceOptions } from '../Components/MultiChoice';
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
  isLast?: boolean;
}

export const EditPreference = ({
  preference,
  update,
  disabled = false,
  label,
  isLast = false,
}: EditPreferenceProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const preferenceLabel =
    label ?? t(`preference.${preference.key}` as LocaleKey);

  // The preference.value only updates after mutation completes and cache
  // is invalidated - use local state for fast UI change
  const [value, setValue] = useState(preference.value);
  const [hasError, setHasError] = useState(false);

  const debouncedUpdate = useDebouncedValueCallback(
    async value => {
      const success = await update(value);
      setHasError(!success);

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
          isLast={isLast}
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
              disabled={disabled}
            />
          }
          isLast={isLast}
        />
      );

    case PreferenceValueNodeType.String:
      if (!isString(preference.value)) {
        return t('error.something-wrong');
      }
      return (
        <PreferenceLabelRow
          label={preferenceLabel}
          Input={
            <BasicTextInput
              value={value}
              onChange={e => handleChange(e.target.value)}
              onBlur={() => {}}
              disabled={disabled}
              sx={
                hasError
                  ? {
                      borderColor: theme => theme.palette.error.main,
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderRadius: '8px',
                    }
                  : undefined
              }
            />
          }
          isLast={isLast}
        />
      );

    case PreferenceValueNodeType.MultiChoice:
      if (!Array.isArray(value)) {
        return t('error.something-wrong');
      }
      const options = getMultiChoiceOptions(t, preference.key);

      return (
        <PreferenceLabelRow
          label={preferenceLabel}
          Input={
            <MultiChoice
              disabled={disabled}
              options={options}
              value={value}
              onChange={handleChange}
            />
          }
          isLast={isLast}
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
          isLast={isLast}
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
