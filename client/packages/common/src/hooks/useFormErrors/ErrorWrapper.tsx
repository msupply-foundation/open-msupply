import React, { Children, PropsWithChildren, useCallback } from 'react';
import { FormErrors } from './useFormErrors';

interface ErrorWrapperProps {
  code: string;
  formErrors: FormErrors;
  required?: boolean;
}

export const ErrorWrapper: React.FC<PropsWithChildren<ErrorWrapperProps>> = ({
  children,
  code,
  formErrors,
  required = false,
}) => {
  const { errors, setError, getError, hasErrors, clearErrors, getErrorSetter } =
    formErrors;

  const errorMessage = errors[code] ?? undefined;
  const error = !!errorMessage;
  const setThisError = useCallback(getErrorSetter(code), [code]);

  return Children.map(children, child =>
    React.cloneElement(child, {
      error,
      errorMessage,
      setError: setThisError,
    })
  );
};
