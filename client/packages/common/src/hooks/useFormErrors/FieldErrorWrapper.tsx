import React, { useEffect } from 'react';
import { useTranslation } from '@openmsupply-client/common';
import {
  useDisplayRequiredErrors,
  useFormErrorActions,
} from './FormErrorStore';

export type FieldErrorWrapperProps<T> = {
  code: string;
  label?: string;
  value: T;
  required?: boolean;
  customIsValid?: boolean;
  customErrorMessage?: string;
  children: (fieldProps: {
    value: T;
    required?: boolean;
    error: boolean;
    setError: (errorMessage: string | null) => void;
  }) => React.ReactNode;
};

export const FieldErrorWrapper = <T,>({
  code,
  label,
  value,
  required,
  customIsValid,
  customErrorMessage,
  children,
}: FieldErrorWrapperProps<T>) => {
  const {
    registerField,
    unregisterField,
    setError,
    getErrorData,
    updateErrorData,
  } = useFormErrorActions();

  const displayRequiredErrors = useDisplayRequiredErrors();

  const t = useTranslation();

  const errorData = getErrorData(code);

  useEffect(() => {
    registerField(code, { required, label });
    return () => unregisterField(code);
  }, [code, label]);

  useEffect(() => {
    const { requiredError } = errorData;

    if (customIsValid === true) {
      setError(code, customErrorMessage ?? 'Invalid input', true);
      return;
    } else if (customIsValid === false) {
      setError(code, null, true);
    }

    if (required && !value) {
      updateErrorData(code, { requiredError: t('messages.required-field') });
    } else if (requiredError) {
      updateErrorData(code, { requiredError: null });
    }
  }, [value, required, customIsValid, customErrorMessage]);

  const errorMessage =
    errorData.error ?? (displayRequiredErrors ? errorData.requiredError : null);

  return (
    <>
      {children({
        value,
        required,
        error: errorMessage != null,
        setError: (errorMessage: string | null) => setError(code, errorMessage),
      })}
    </>
  );
};
