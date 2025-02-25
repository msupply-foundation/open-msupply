import { Alert } from '@common/components';
import React, {
  Children,
  createContext,
  PropsWithChildren,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

type Code = string;
type ErrorState = Record<Code, string | null>;

export interface FormErrorContextState {
  errorState: ErrorState;
  setError: (code: Code, error: string | null) => void;
  getError: (code: Code) => string | null;
  hasErrors: boolean;
  clearErrors: () => void;
  getErrorSetter: (code: string) => (error: string | null) => void;
  checkRequiredFields: (draft: Record<string, unknown>) => boolean;
  resetRequiredErrors: () => void;
  setRequired: (code: string, required: boolean) => void;
}

interface ErrorWrapperProps {
  code: string;
  required?: boolean;
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
  const requiredFields = useRef<Set<string>>(new Set());

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

  const checkRequiredFields = (draft: Record<string, unknown>) => {
    if (!draft) return false;
    properErrors.current = { ...errorState };
    const newErrorState = { ...errorState };
    requiredFields.current.forEach(field => {
      if (
        draft[field] === null ||
        draft[field] === undefined ||
        draft[field] === ''
      )
        newErrorState[field] = `required field`;
    });
    setErrorState(newErrorState);
    return Object.values(newErrorState).some(val => val !== null);
  };

  const resetRequiredErrors = () => {
    if (properErrors.current !== null) {
      setErrorState(properErrors.current);
      properErrors.current = null;
    }
  };

  const setRequired = (code: string, required: boolean) => {
    if (required) requiredFields.current.add(code);
    else requiredFields.current.delete(code);
  };

  const returnState: FormErrorContextState = {
    errorState,
    setError,
    getError,
    hasErrors,
    clearErrors,
    getErrorSetter,
    checkRequiredFields,
    resetRequiredErrors,
    setRequired,
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

export const ErrorWrapper: React.FC<PropsWithChildren<ErrorWrapperProps>> = ({
  children,
  code,
  required = false,
}) => {
  const { errorState, getErrorSetter, setRequired } = useFormErrorsHook();
  const errorMessage = errorState[code] ?? undefined;
  const error = !!errorMessage;
  const setThisError = getErrorSetter(code);

  useEffect(() => {
    setRequired(code, required);
  }, [required]);

  return Children.map(children, child => {
    if (React.isValidElement(child))
      return React.cloneElement(child, {
        error,
        errorMessage,
        setError: setThisError,
        required,
      });
    else return child;
  });
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
