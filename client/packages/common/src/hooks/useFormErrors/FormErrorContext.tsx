import React, {
  createContext,
  ReactNode,
  useContext,
  useRef,
  useState,
} from 'react';
import { List, ListItem } from '@openmsupply-client/common';
import { Alert } from '@common/components';
import { useTranslation } from '@common/intl';
import { AlertIcon } from '@common/icons';

type Code = string;
type ErrorState = Record<Code, string | null>;
type RequiredState = Record<Code, boolean>;

type GetErrorPropsInput<T> = {
  code: string;
  value: T;
  required?: boolean;
  customValidation?: () => boolean;
  customErrorMessage?: string;
};

export interface FormErrorContextState {
  errorState: ErrorState;
  requiredState: Record<Code, boolean>;
  // setError: (code: Code, error: string | null) => void;
  getError: (code: Code) => string | null;
  hasErrors: () => boolean;
  clearErrors: () => void;
  setRequiredErrors: () => boolean;
  resetRequiredErrors: () => void;
  getErrorProps: <T>(input: GetErrorPropsInput<T>) => {
    error: boolean;
    errorMessage?: string;
    setError: (error: string | null) => void;
    required?: boolean;
    value: T;
  };
  includeRequiredInErrorState: boolean;
}

const FormErrorContext = createContext<FormErrorContextState | null>(null);

interface FormErrorContextProps {
  children: ReactNode;
}

export const FormErrorProvider: React.FC<FormErrorContextProps> = ({
  children,
}) => {
  const t = useTranslation();
  // Keeps the error state for each code: { code: "Error message" | null, ...}
  const [errorState, setErrorState] = useState<ErrorState>({});

  // Keeps the required state for each code: { code: true/false, ...}
  const [requiredState, setRequiredState] = useState<RequiredState>({});

  // When displaying errors (in ErrorDisplay component), should the missing
  // "required" fields be shown as errors?
  const [includeRequiredInErrorState, setIncludeRequiredInErrorState] =
    useState(false);

  // Actual errors and missing required fields can be mixed together in
  // ErrorState, so this object just stores the "proper" errors so we can
  // distinguish them from missing Required fields when displaying
  const properErrors = useRef<ErrorState | null>(null);

  // Sets (or unsets) the error message for a given code
  const setError = (code: Code, error: string | null) => {
    if (errorState[code] === error) return;
    setErrorState(prev => {
      const newErrorState = { ...prev };
      newErrorState[code] = error;
      return newErrorState;
    });
  };

  // Sets (or unsets) the required state for a given code
  const updateRequired = (code: string, state: boolean | null) => {
    if (state === null) {
      if (requiredState[code] !== undefined) delete requiredState[code];
      return;
    }
    if (state !== requiredState[code])
      setRequiredState(prev => ({ ...prev, [code]: state }));
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

  // Set
  const setRequiredErrors = () => {
    properErrors.current = { ...errorState };
    const newErrorState = { ...errorState };
    Object.entries(requiredState).forEach(([key, value]) => {
      if (value === false) newErrorState[key] = t('messages.required-field');
    });
    setErrorState(newErrorState);
    setIncludeRequiredInErrorState(true);
    return Object.values(newErrorState).some(val => val !== null);
  };

  const resetRequiredErrors = () => {
    if (properErrors.current !== null) {
      setErrorState(properErrors.current);
      properErrors.current = null;
    }
  };

  console.log('errorState', errorState);
  /**
   * Method to return the props for the individual form components, while
   * simultaneously capturing required state for use in here
   */
  const getErrorProps = <T,>({
    code,
    value,
    required,
    customValidation,
    customErrorMessage,
  }: GetErrorPropsInput<T>) => {
    const failCustomValidation = customValidation && !customValidation();
    const error = failCustomValidation || errorState[code] != null;
    const errorMessage = customErrorMessage ?? errorState[code] ?? undefined;

    const setThisError = (error: string | null) =>
      setError(code, customErrorMessage ?? error);

    if (required) {
      if (value === null || value === undefined || value === '')
        updateRequired(code, false);
      else updateRequired(code, true);
    } else {
      updateRequired(code, null);
    }

    if (failCustomValidation) {
      setError(code, customErrorMessage ?? 'Failed custom validation');
    } else if (customValidation && requiredState[code]) setError(code, null);

    return {
      error,
      errorMessage,
      setError: setThisError,
      value,
      required,
    };
  };

  return (
    <FormErrorContext.Provider
      value={{
        // These first three primarily used by Form components:
        getErrorProps,
        hasErrors,
        resetRequiredErrors,

        // These ones required by the ErrorDisplay component (below):
        errorState,
        requiredState,
        includeRequiredInErrorState,

        // Currently not used outside this Context, but could be useful:
        getError,
        clearErrors,
        setRequiredErrors,
      }}
    >
      {children}
    </FormErrorContext.Provider>
  );
};

export const useFormErrors = () => {
  const context = useContext(FormErrorContext);

  if (!context)
    throw new Error(
      'useFormErrors must be used within FormErrorContext Provider'
    );

  return context;
};

export const ErrorDisplay: React.FC<unknown> = () => {
  const t = useTranslation();
  const { errorState, requiredState, includeRequiredInErrorState } =
    useFormErrors();

  const errorsToDisplay = { ...errorState };
  if (includeRequiredInErrorState)
    Object.entries(requiredState).forEach(([key, value]) => {
      if (value === false) errorsToDisplay[key] = t('messages.required-field');
    });

  const errorList = Object.entries(errorsToDisplay).filter(
    ([_, value]) => value !== null
  );
  if (errorList.length === 0) return null;

  return (
    <Alert
      severity="error"
      sx={{
        whiteSpace: 'pre-wrap',
        '& .MuiAlert-icon': { alignItems: 'center' },
      }}
      Icon={<AlertIcon fontSize="large" />}
    >
      {t('messages.alert-problem-with-form-input')}
      <List sx={{ m: 0, p: 0 }}>
        {errorList.map(([key, value]) => {
          return (
            <ListItem
              key={key}
              sx={{ pt: 0, pb: 0, m: 0 }}
            >{`- ${key}: ${value}`}</ListItem>
          );
        })}
      </List>
    </Alert>
  );
};
