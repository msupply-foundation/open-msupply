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
  useAuthContext,
  UserPermission,
  useIsCentralServerApi,
} from '@openmsupply-client/common';
import { MultiChoice, getMultiChoiceOptions } from '../Components/MultiChoice';
import { EditCustomTranslations } from '../Components/CustomTranslations/CustomTranslationsModal';
import { EditBackdatingOfShipments } from '../Components/EditBackdatingOfShipments';
import { EditWarningWhenMissingRecentStocktakeData } from '../Components/EditWarningWhenMissingRecentStocktakeData';
import { PreferenceLabelRow } from './PreferenceLabelRow';
import { ColorPickerPreference } from '../Components/ColorPickerPreference';

interface EditPreferenceProps {
  preference: PreferenceDescriptionNode;
  update: (
    input: UpsertPreferencesInput[keyof UpsertPreferencesInput]
  ) => Promise<boolean>;
  label?: string;
  isLast?: boolean;
  disabled?: boolean;
}

export const EditPreference = ({
  preference,
  update,
  label,
  isLast = false,
  disabled: disabledProp,
}: EditPreferenceProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const { userHasPermission } = useAuthContext();
  const isCentralServer = useIsCentralServerApi();

  const disabled =
    disabledProp ||
    !isCentralServer ||
    !userHasPermission(UserPermission.EditCentralData);

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
    case PreferenceValueNodeType.Float:
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
              decimalLimit={
                preference.valueType === PreferenceValueNodeType.Float
                  ? 2
                  : 0
              }
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

    case PreferenceValueNodeType.Colour:
      if (!isString(preference.value)) {
        return t('error.something-wrong');
      }
      return (
        <PreferenceLabelRow
          label={preferenceLabel}
          Input={
            <ColorPickerPreference
              value={value}
              onChange={handleChange}
              disabled={disabled}
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
              preferenceKey={preference.key}
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
            <EditCustomTranslations
              value={preference.value}
              update={update}
              disabled={disabled}
            />
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
    case PreferenceValueNodeType.BackdatingOfShipmentsData:
      return (
        <EditBackdatingOfShipments
          value={value}
          update={handleChange}
          disabled={disabled}
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
