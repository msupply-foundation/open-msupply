import { useState } from 'react';

type Code = string;
type ErrorState = Record<Code, string | null>;

export interface FormErrors {
  errors: ErrorState;
  setError: (code: Code, error: string | null) => void;
  getError: (code: Code) => string | null;
  hasErrors: boolean;
  clearErrors: () => void;
  getErrorSetter: (code: string) => (error: string | null) => void;
}

export const useFormErrors = () => {
  const [errorState, setErrorState] = useState<ErrorState>({});

  const setError = (code: Code, error: string | null) => {
    setErrorState(prev => {
      const newErrorState = { ...prev };
      newErrorState[code] = error;
      return newErrorState;
    });
  };

  const getError = (code: Code) => errorState?.[code] ?? null;

  const clearErrors = () => {
    const newErrorState = { ...errorState };
    Object.keys(newErrorState).forEach(code => {
      newErrorState[code] = null;
    });
    setErrorState(newErrorState);
  };

  const checkForErrors = () => {
    const errors = Object.values(errorState);
    return errors.some(val => val !== null);
  };

  const hasErrors = checkForErrors();

  const getErrorSetter = (code: string) => (error: string | null) =>
    setError(code, error);

  const returnState: FormErrors = {
    errors: errorState,
    setError,
    getError,
    hasErrors,
    clearErrors,
    getErrorSetter,
  };

  return returnState;
};
