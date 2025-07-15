import React, { useEffect } from 'react';
import { useTranslation } from '@openmsupply-client/common';
import { useFormErrorContext } from './NewFormErrorContext';

type FieldErrorWrapperProps = {
  code: string;
  label?: string;
  value: string | undefined;
  required?: boolean;
  customIsValid?: boolean;
  customErrorMessage?: string;
  children: (fieldProps: {
    value: string | undefined;
    required?: boolean;
    errorMessage?: string | null;
    setError: (errorMessage: string | null) => void;
  }) => React.ReactNode;
};

export const FieldErrorWrapper: React.FC<FieldErrorWrapperProps> = ({
  code,
  label,
  value,
  required,
  customIsValid,
  customErrorMessage,
  children,
}) => {
  const {
    registerField,
    unregisterField,
    setError,
    getErrorData,
    updateErrorData,
    displayRequiredErrors,
  } = useFormErrorContext();

  const t = useTranslation();

  const errorData = getErrorData(code);

  useEffect(() => {
    registerField(code, { required, label });
    return () => unregisterField(code);
  }, [code, label]);

  useEffect(() => {
    const { requiredError } = errorData;

    if (customIsValid === false) {
      updateErrorData(code, { error: customErrorMessage ?? 'Invalid input' });
    } else if (customIsValid === true) {
      updateErrorData(code, { error: null });
    }

    if (required && !value) {
      updateErrorData(code, { requiredError: t('messages.required-field') });
    } else if (requiredError) {
      updateErrorData(code, { requiredError: null });
    }
  }, [value, required, customIsValid, customErrorMessage]);

  const errorMessage =
    errorData.error || displayRequiredErrors ? errorData.requiredError : null;

  return (
    <>
      {children({
        value,
        required,
        errorMessage,
        setError: (errorMessage: string | null) => setError(code, errorMessage),
      })}
    </>
  );
};
