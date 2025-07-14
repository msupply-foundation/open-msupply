import React, { useEffect } from 'react';
import { useTranslation } from '@openmsupply-client/common';
import { useFormErrorContext } from './NewFormErrorContext';

type FieldErrorWrapperProps = {
  code: string;
  label?: string;
  value: string | undefined;
  required?: boolean;
  customValidation?: () => boolean;
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
  customValidation,
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

    if (customValidation && !customValidation()) {
      updateErrorData(code, { error: customErrorMessage ?? 'Invalid input' });
    }

    if (required && !value) {
      updateErrorData(code, { requiredError: t('messages.required-field') });
    } else if (requiredError) {
      updateErrorData(code, { requiredError: null });
    }
  }, [value, required, customValidation, customErrorMessage]);

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
