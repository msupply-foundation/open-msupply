import { Alert } from '@mui/material';
import React, {
  Children,
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

type Code = string;
type ErrorState = Record<Code, string | null>;

export interface FormErrors {
  errors: ErrorState;
  setError: (code: Code, error: string | null) => void;
  getError: (code: Code) => string | null;
  hasErrors: boolean;
  clearErrors: () => void;
  getErrorSetter: (code: string) => (error: string | null) => void;
  checkRequired: () => boolean;
  resetRequired: () => void;
  ErrorWrapper: React.FC<PropsWithChildren<ErrorWrapperProps>>;
  ErrorDisplay: React.FC<{}>;
}

interface ErrorWrapperProps {
  code: string;
  // formErrors: FormErrors;
  required?: boolean;
}

export const useFormErrors = (
  draft?: Record<string, unknown>
  // onChange: () => void
) => {
  const [errorState, setErrorState] = useState<ErrorState>({});
  const properErrors = useRef<ErrorState | null>(null);
  const requiredFields = useRef<Set<string>>(new Set());

  // useEffect(() => {
  //   console.log('draft', draft);
  //   if (properErrors.current !== null) {
  //     resetRequired();
  //   }
  // }, [draft]);

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

  const checkRequired = () => {
    console.log('Draft', draft);
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

  const resetRequired = () => {
    if (properErrors.current !== null) {
      setErrorState(properErrors.current);
      properErrors.current = null;
    }
  };

  // const update = useCallback(
  //   (data: any) => {
  //     resetRequired();
  //     onChange(data);
  //   },
  //   [onChange]
  // );

  const ErrorWrapper: React.FC<PropsWithChildren<ErrorWrapperProps>> =
    useCallback(
      ({ children, code, required = false }) => {
        const errorMessage = errorState[code] ?? undefined;
        const error = !!errorMessage;
        const setThisError = getErrorSetter(code);

        console.log('CODE', code);

        useEffect(() => {
          if (required) requiredFields.current.add(code);
          else requiredFields.current.delete(code);
        }, [required]);

        return Children.map(children, child =>
          React.cloneElement(child, {
            error,
            errorMessage,
            setError: setThisError,
            required,
          })
        );
      },
      [errorState]
    );

  const ErrorDisplay: React.FC<unknown> = useCallback(() => {
    if (Object.keys(errorState).length === 0) return null;
    return (
      <Alert severity="error" sx={{ whiteSpace: 'pre-wrap' }}>
        Problems with form input:
        {Object.entries(errorState).map(([key, value]) => {
          return `\n${key}: ${value}`;
        })}
      </Alert>
    );
  }, [errorState]);

  const returnState: FormErrors = {
    errors: errorState,
    setError,
    getError,
    hasErrors,
    clearErrors,
    getErrorSetter,
    checkRequired,
    resetRequired,
    ErrorWrapper,
    ErrorDisplay,
  };

  return returnState;
};
