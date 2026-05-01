import React from 'react';
import { CustomErrorValue, useFormField } from './useFormField';

export type FieldErrorWrapperProps<T> = {
  formId: string;
  fieldId: string;
  label: string;
  value: T;
  required?: boolean;
  validate?: (value: T) => string | null;
  customError?: CustomErrorValue;
  children: (fieldProps: {
    error: boolean;
    required: boolean;
    setCustomError: (message: string | null) => void;
    setValidationError: (message: string | null) => void;
  }) => React.ReactNode;
};

/**
 * Render-prop wrapper for components that can't (or shouldn't) be modified to
 * call `useFormField` directly. Prefer the `formError` prop on
 * BasicTextInput/NumericTextInput/Autocomplete/DateTimePickerInput/Select where
 * available.
 */
export const FieldErrorWrapper = <T,>({
  formId,
  fieldId,
  label,
  value,
  required = false,
  validate,
  customError,
  children,
}: FieldErrorWrapperProps<T>) => {
  const { error, setCustomError, setValidationError } = useFormField({
    formId,
    fieldId,
    label,
    value,
    required,
    validate,
    customError,
  });

  return (
    <>
      {children({ error, required, setCustomError, setValidationError })}
    </>
  );
};
