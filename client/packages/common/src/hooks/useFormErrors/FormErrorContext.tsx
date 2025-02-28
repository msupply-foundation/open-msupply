import { Alert } from '@common/components';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

type Code = string;
type ErrorState = Record<Code, string | null>;

type GetErrorPropsInput<T> = {
  code: string;
  value: T;
  required?: boolean;
};

export interface FormErrorContextState {
  errorState: ErrorState;
  setError: (code: Code, error: string | null) => void;
  getError: (code: Code) => string | null;
  hasErrors: () => boolean;
  clearErrors: () => void;
  setRequiredErrors: () => boolean;
  resetRequiredErrors: () => void;
  getErrorProps: <T>(input: GetErrorPropsInput<T>) => {
    error: boolean;
    errorMessage?: string;
    setError: any;
    required?: boolean;
    value: T;
  };
}

const FormErrorContext = createContext<FormErrorContextState | null>(null);

interface FormErrorContextProps {
  children: ReactNode;
}

export const FormErrorProvider: React.FC<FormErrorContextProps> = ({
  children,
}) => {
  const [errorState, setErrorState] = useState<ErrorState>({});
  const properErrors = useRef<ErrorState | null>(null);
  const requiredState = useRef<Record<Code, boolean>>({});

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

  const hasErrors = () => {
    if (setRequiredErrors()) return true;
    const errors = Object.values(errorState);
    return errors.some(val => val !== null);
  };

  const resetRequiredErrors = () => {
    if (properErrors.current !== null) {
      setErrorState(properErrors.current);
      properErrors.current = null;
    }
  };

  const getErrorProps = <T,>({
    code,
    value,
    required,
  }: {
    code: string;
    value: T;
    required?: boolean;
  }) => {
    const errorMessage = errorState[code] ?? undefined;
    const error = !!errorMessage;
    const setThisError = useCallback(
      (code: string) => (error: string | null) => setError(code, error),
      []
    );
    if (required) {
      if (value === null || value === undefined || value === '')
        requiredState.current[code] = false;
      else requiredState.current[code] = true;
    }
    return {
      error,
      errorMessage,
      setError: setThisError,
      value,
      required,
    };
  };

  const setRequiredErrors = () => {
    properErrors.current = { ...errorState };
    const newErrorState = { ...errorState };
    Object.entries(requiredState.current).forEach(([key, value]) => {
      if (value === false) newErrorState[key] = `required field`;
    });
    setErrorState(newErrorState);
    return Object.values(newErrorState).some(val => val !== null);
  };

  const returnState: FormErrorContextState = {
    errorState,
    setError,
    getError,
    hasErrors,
    clearErrors,
    setRequiredErrors,
    resetRequiredErrors,
    getErrorProps,
  };

  return (
    <FormErrorContext.Provider value={returnState}>
      {children}
    </FormErrorContext.Provider>
  );
};

export const useFormErrorsHook = () => {
  const context = useContext(FormErrorContext);

  if (!context)
    throw new Error(
      'useFormErrors must be used within FormErrorContext Provider'
    );

  return context;
};

export const ErrorDisplay: React.FC<unknown> = () => {
  const { errorState } = useFormErrorsHook();
  if (Object.keys(errorState).length === 0) return null;
  return (
    <Alert severity="error" sx={{ whiteSpace: 'pre-wrap' }}>
      Problems with form input:
      {Object.entries(errorState).map(([key, value]) => {
        return `\n${key}: ${value}`;
      })}
    </Alert>
  );
};
