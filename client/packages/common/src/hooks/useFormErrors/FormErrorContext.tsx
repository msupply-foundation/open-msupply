import React, { createContext, useContext, useState } from 'react';
import { useSyncExternalStore } from 'react';
import { FieldErrorEntry, formErrorStore } from './FormErrorStore';

type FormErrorContextType = {
  registerField: (code: string, errorData?: Partial<FieldErrorEntry>) => void;
  unregisterField: (code: string) => void;
  setError: (
    code: string,
    error: string | null,
    isCustomError?: boolean
  ) => void;
  getErrorData: (code: string) => FieldErrorEntry;
  updateErrorData: (code: string, errorData: Partial<FieldErrorEntry>) => void;
  errors: Record<string, FieldErrorEntry>;
  displayRequiredErrors: boolean;
  showRequiredErrors: () => void;
  resetRequiredErrors: () => void;
  hasErrors: () => boolean;
};

const FormErrorContext = createContext<FormErrorContextType | null>(null);

export const useFormErrorContext = () => {
  const ctx = useContext(FormErrorContext);
  if (!ctx)
    throw new Error('useFormErrorContext must be used inside a provider');
  return ctx;
};

export const FormErrorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const errors = useSyncExternalStore(
    formErrorStore.subscribe,
    formErrorStore.getSnapshot
  );
  const [displayRequiredErrors, setDisplayRequiredErrors] = useState(false);

  console.log('errors', errors);

  const hasErrors = () => {
    return Object.values(errors).some(
      err => err.error !== null || err.requiredError
    );
  };

  return (
    <FormErrorContext.Provider
      value={{
        registerField: formErrorStore.registerField,
        unregisterField: formErrorStore.unregisterField,
        setError: formErrorStore.setError,
        getErrorData: formErrorStore.getErrorData,
        updateErrorData: formErrorStore.updateFieldErrorData,
        errors,
        displayRequiredErrors,
        showRequiredErrors: () => setDisplayRequiredErrors(true),
        resetRequiredErrors: () => setDisplayRequiredErrors(false),
        hasErrors,
      }}
    >
      {children}
    </FormErrorContext.Provider>
  );
};
