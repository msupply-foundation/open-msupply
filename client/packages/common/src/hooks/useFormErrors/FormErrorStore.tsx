import { create, StoreApi, UseBoundStore } from 'zustand';
import React, { createContext, useContext, useMemo } from 'react';

export type FieldErrorEntry = {
  error: string | null;
  isCustomError?: boolean;
  label?: string;
  required?: boolean;
  requiredError?: string | null;
};

type FormErrorState = {
  errors: Record<string, FieldErrorEntry>;
  displayRequiredErrors: boolean;
};

type FormErrorActions = {
  registerField: (code: string, errorData?: Partial<FieldErrorEntry>) => void;
  unregisterField: (code: string) => void;
  setError: (
    code: string,
    error: string | null,
    isCustomError?: boolean
  ) => void;
  getErrorData: (code: string) => FieldErrorEntry;
  updateErrorData: (code: string, errorData: Partial<FieldErrorEntry>) => void;
  showRequiredErrors: () => void;
  resetRequiredErrors: () => void;
  hasErrors: () => boolean;
  clearAllErrors: () => void;
};

export type FormErrorStore = FormErrorState & FormErrorActions;

// Helper function to create store configuration
const createStoreConfig =
  () =>
  (set: any, get: any): FormErrorStore => ({
    // Initial state
    errors: {},
    displayRequiredErrors: false,

    // Actions
    registerField: (code: string, errorData?: Partial<FieldErrorEntry>) => {
      set((state: FormErrorStore) => {
        if (!(code in state.errors)) {
          return {
            errors: {
              ...state.errors,
              [code]: {
                error: null,
                ...errorData,
              },
            },
          };
        }
        return state;
      });
    },

    unregisterField: (code: string) => {
      set((state: FormErrorStore) => {
        if (code in state.errors) {
          const { [code]: removed, ...remainingErrors } = state.errors;
          return {
            errors: remainingErrors,
          };
        }
        return state;
      });
    },

    setError: (code: string, error: string | null, isCustomError?: boolean) => {
      set((state: FormErrorStore) => {
        const existing = state.errors[code];
        if (existing?.error !== error) {
          if (existing?.isCustomError && !isCustomError) return state;

          return {
            errors: {
              ...state.errors,
              [code]: {
                ...existing,
                error,
                isCustomError: error ? isCustomError : false,
              },
            },
          };
        }
        return state;
      });
    },

    updateErrorData: (code: string, errorData: Partial<FieldErrorEntry>) => {
      set((state: FormErrorStore) => {
        const existing = state.errors[code];
        if (existing) {
          return {
            errors: {
              ...state.errors,
              [code]: {
                ...existing,
                ...errorData,
                error:
                  errorData.error !== undefined
                    ? errorData.error
                    : existing.error,
              },
            },
          };
        }
        return state;
      });
    },

    getErrorData: (code: string): FieldErrorEntry => {
      const state = get();
      if (!state.errors?.[code]) {
        return { error: null };
      }
      return state.errors[code];
    },

    showRequiredErrors: () => {
      set({ displayRequiredErrors: true });
    },

    resetRequiredErrors: () => {
      set({ displayRequiredErrors: false });
    },

    hasErrors: () => {
      const state = get();
      return Object.values(state.errors).some(
        (err: any) => err.error !== null || err.requiredError
      );
    },

    clearAllErrors: () => {
      set((state: FormErrorStore) => {
        const updatedErrors = { ...state.errors };
        let changed = false;

        Object.keys(updatedErrors).forEach(key => {
          const entry = updatedErrors[key];
          if (entry?.error !== null) {
            updatedErrors[key] = {
              ...entry,
              error: null,
            };
            changed = true;
          }
        });

        if (changed) {
          return { errors: updatedErrors };
        }
        return state;
      });
    },
  });

// Context
const FormErrorContext = createContext<UseBoundStore<
  StoreApi<FormErrorStore>
> | null>(null);

// Provider that creates store directly
export const FormErrorProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // Create store directly in the provider using useMemo
  const store = useMemo(() => {
    return create<FormErrorStore>(createStoreConfig());
  }, []);

  return (
    <FormErrorContext.Provider value={store}>
      {children}
    </FormErrorContext.Provider>
  );
};

// Hook to use the store
export const useFormErrorStore = () => {
  const store = useContext(FormErrorContext);
  if (!store) {
    throw new Error(
      'useFormErrorStore must be used within a FormErrorProvider'
    );
  }
  return store;
};

// Convenience hooks
export const useFormErrors = () => useFormErrorStore()(state => state.errors);
export const useDisplayRequiredErrors = () =>
  useFormErrorStore()(state => state.displayRequiredErrors);
export const useFormErrorActions = () =>
  useFormErrorStore()(state => ({
    registerField: state.registerField,
    unregisterField: state.unregisterField,
    setError: state.setError,
    getErrorData: state.getErrorData,
    updateErrorData: state.updateErrorData,
    showRequiredErrors: state.showRequiredErrors,
    resetRequiredErrors: state.resetRequiredErrors,
    hasErrors: state.hasErrors,
    clearAllErrors: state.clearAllErrors,
  }));
