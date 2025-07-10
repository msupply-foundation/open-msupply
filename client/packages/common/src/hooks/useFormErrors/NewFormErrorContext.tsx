// FormErrorContext.tsx
import React, { createContext, useContext } from 'react';
import { useSyncExternalStore } from 'react';
import { FieldErrorEntry, formErrorStore } from './FormErrorStore';

type FormErrorContextType = {
  registerField: (code: string, errorData?: Partial<FieldErrorEntry>) => void;
  unregisterField: (code: string) => void;
  setError: (code: string, error: string | null) => void;
  getErrorData: (code: string) => FieldErrorEntry;
  updateErrorData: (code: string, errorData: Partial<FieldErrorEntry>) => void;
  errors: Record<string, FieldErrorEntry>;
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

  console.log('errors', errors);

  return (
    <FormErrorContext.Provider
      value={{
        registerField: formErrorStore.registerField,
        unregisterField: formErrorStore.unregisterField,
        setError: formErrorStore.setError,
        getErrorData: formErrorStore.getErrorData,
        updateErrorData: formErrorStore.updateFieldErrorData,
        errors,
      }}
    >
      {children}
    </FormErrorContext.Provider>
  );
};
