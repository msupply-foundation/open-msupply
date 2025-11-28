import {
  LocaleKey,
  PreferenceKey,
  TypedTFunction,
  UpsertPreferencesInput,
} from '@openmsupply-client/common';
import { AdminPreferenceFragment } from './operations.generated';
import { Dispatch, SetStateAction } from 'react';

export const inputValidation = (
  input: Partial<UpsertPreferencesInput>,
  t: TypedTFunction<LocaleKey>,
  warning: (msg: string) => () => void,
  preferences?: AdminPreferenceFragment[],
  setActionValid?: Dispatch<SetStateAction<boolean>>
): boolean => {
  const thresholdResult = thresholdValidation(input, t, warning, preferences);

  // Combine results
  const isValid = thresholdResult; // && otherResult

  setActionValid?.(isValid);

  return isValid;
};

const thresholdValidation = (
  input: Partial<UpsertPreferencesInput>,
  t: TypedTFunction<LocaleKey>,
  warning: (msg: string) => () => void,
  preferences?: AdminPreferenceFragment[]
) => {
  const inputFirstThreshold = input?.firstThresholdForExpiringItems?.[0]?.value;
  const inputSecondThreshold =
    input?.secondThresholdForExpiringItems?.[0]?.value;

  // Second threshold should not exceed 30 days
  if (inputSecondThreshold && inputSecondThreshold > 30) {
    warning(t('label.second-threshold-exceeds-days'))();
    return false;
  }

  const existingFirstThreshold = preferences?.find(
    pref => pref.key === PreferenceKey.FirstThresholdForExpiringItems
  )?.value;
  const existingSecondThreshold = preferences?.find(
    pref => pref.key === PreferenceKey.SecondThresholdForExpiringItems
  )?.value;

  const firstThreshold = inputFirstThreshold ?? existingFirstThreshold;
  const secondThreshold = inputSecondThreshold ?? existingSecondThreshold;

  // Second threshold should not be less than first threshold
  if (
    firstThreshold != null &&
    secondThreshold != null &&
    secondThreshold !== 0 &&
    secondThreshold < firstThreshold
  ) {
    warning(t('label.second-threshold-is-less-than-first-threshold'))();
    return false;
  }

  return true;
};
