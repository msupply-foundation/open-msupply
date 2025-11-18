import {
  LocaleKey,
  TypedTFunction,
  UpsertPreferencesInput,
} from '@openmsupply-client/common';
import { Dispatch, SetStateAction } from 'react';

export const inputValidation = (
  input: Partial<UpsertPreferencesInput>,
  t: TypedTFunction<LocaleKey>,
  warning: (msg: string) => () => void,
  setActionValid?: Dispatch<SetStateAction<boolean>>
): boolean => {
  const thresholdResult = thresholdValidation(input, t, warning);

  // Combine results
  const isValid = thresholdResult; // && otherResult

  setActionValid?.(isValid);

  return isValid;
};

const thresholdValidation = (
  input: Partial<UpsertPreferencesInput>,
  t: TypedTFunction<LocaleKey>,
  warning: (msg: string) => () => void
) => {
  const inputFirstThreshold = input?.firstThresholdForExpiringItems?.[0]?.value;
  const inputSecondThreshold =
    input?.secondThresholdForExpiringItems?.[0]?.value;

  // Second threshold should not exceed 30 days
  if (
    (inputSecondThreshold && inputSecondThreshold > 30) ||
    (inputFirstThreshold && inputFirstThreshold > 30)
  ) {
    warning(t('label.threshold-exceeds-days'))();
    return false;
  }

  return true;
};
