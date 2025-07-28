import { useTranslation } from '@common/intl';
import { useEffect } from 'react';
import { create } from 'zustand';

export type FieldErrorEntry = {
  error: string | null;
  isCustomError?: boolean;
  label?: string;
  required?: boolean;
  requiredError?: string | null;
};

type FormErrorState = {
  forms: Record<
    string, // formId
    {
      errors: Record<string /* field id/code */, FieldErrorEntry>;
      displayRequiredErrors: boolean;
    }
  >;
};

type FormErrorActions = {
  registerField: (
    formId: string,
    code: string,
    errorData?: Partial<FieldErrorEntry>
  ) => void;
  unregisterField: (formId: string, code: string) => void;
  setError: (
    formId: string,
    code: string,
    error: string | null,
    isCustomError?: boolean
  ) => void;
  getErrorData: (formId: string, code: string) => FieldErrorEntry;
  updateErrorData: (
    formId: string,
    code: string,
    errorData: Partial<FieldErrorEntry>
  ) => void;
  showRequiredErrors: (formId: string) => void;
  resetRequiredErrors: (formId: string) => void;
  hasErrors: (formId: string) => boolean;
  clearAllErrors: (formId: string) => void;
  getFormErrors: (formId: string) => Record<string, FieldErrorEntry>;
  getDisplayRequiredErrors: (formId: string) => boolean;
};

export type FormErrorStore = FormErrorState & FormErrorActions;

// Create the global store
const useFormErrorStore = create<FormErrorStore>((set, get) => ({
  // Initial state
  forms: {},

  // Actions
  registerField: (
    formId: string,
    fieldId: string,
    errorData?: Partial<FieldErrorEntry>
  ) => {
    set((state: FormErrorStore) => {
      const form = state.forms[formId];
      if (!form) {
        // Auto-register form if it doesn't exist
        return {
          forms: {
            ...state.forms,
            [formId]: {
              errors: {
                [fieldId]: {
                  error: null,
                  ...errorData,
                },
              },
              displayRequiredErrors: false,
            },
          },
        };
      }

      if (!(fieldId in form.errors)) {
        return {
          forms: {
            ...state.forms,
            [formId]: {
              ...form,
              errors: {
                ...form.errors,
                [fieldId]: {
                  error: null,
                  ...errorData,
                },
              },
            },
          },
        };
      }
      return state;
    });
  },

  unregisterField: (formId: string, code: string) => {
    set((state: FormErrorStore) => {
      const form = state.forms[formId];
      if (form && code in form.errors) {
        const { [code]: _, ...remainingErrors } = form.errors;
        return {
          forms: {
            ...state.forms,
            [formId]: {
              ...form,
              errors: remainingErrors,
            },
          },
        };
      }
      return state;
    });
  },

  setError: (
    formId: string,
    code: string,
    error: string | null,
    isCustomError?: boolean
  ) => {
    set((state: FormErrorStore) => {
      const form = state.forms[formId];
      if (!form) return state;

      const existing = form.errors[code];
      if (existing?.error !== error) {
        if (existing?.isCustomError && !isCustomError) return state;

        return {
          forms: {
            ...state.forms,
            [formId]: {
              ...form,
              errors: {
                ...form.errors,
                [code]: {
                  ...existing,
                  error,
                  isCustomError: error ? isCustomError : false,
                },
              },
            },
          },
        };
      }
      return state;
    });
  },

  updateErrorData: (
    formId: string,
    code: string,
    errorData: Partial<FieldErrorEntry>
  ) => {
    set((state: FormErrorStore) => {
      const form = state.forms[formId];
      if (!form) return state;

      const existing = form.errors[code];
      if (existing) {
        return {
          forms: {
            ...state.forms,
            [formId]: {
              ...form,
              errors: {
                ...form.errors,
                [code]: {
                  ...existing,
                  ...errorData,
                  error:
                    errorData.error !== undefined
                      ? errorData.error
                      : existing.error,
                },
              },
            },
          },
        };
      }
      return state;
    });
  },

  getErrorData: (formId: string, code: string): FieldErrorEntry => {
    const state = get();
    const form = state.forms[formId];
    if (!form?.errors?.[code]) {
      return { error: null };
    }
    return form.errors[code];
  },

  showRequiredErrors: (formId: string) => {
    set((state: FormErrorStore) => {
      const form = state.forms[formId];
      if (!form) return state;

      return {
        forms: {
          ...state.forms,
          [formId]: {
            ...form,
            displayRequiredErrors: true,
          },
        },
      };
    });
  },

  resetRequiredErrors: (formId: string) => {
    set((state: FormErrorStore) => {
      const form = state.forms[formId];
      if (!form) return state;

      return {
        forms: {
          ...state.forms,
          [formId]: {
            ...form,
            displayRequiredErrors: false,
          },
        },
      };
    });
  },

  hasErrors: (formId: string) => {
    const state = get();
    const form = state.forms[formId];
    if (!form) return false;

    return Object.values(form.errors).some(
      (err: FieldErrorEntry) => err.error !== null || err.requiredError
    );
  },

  clearAllErrors: (formId: string) => {
    set((state: FormErrorStore) => {
      const form = state.forms[formId];
      if (!form) return state;

      const updatedErrors = { ...form.errors };
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
        return {
          forms: {
            ...state.forms,
            [formId]: {
              ...form,
              errors: updatedErrors,
            },
          },
        };
      }
      return state;
    });
  },

  getFormErrors: (formId: string) => {
    const state = get();
    const form = state.forms[formId];
    return form?.errors || {};
  },

  getDisplayRequiredErrors: (formId: string) => {
    const state = get();
    const form = state.forms[formId];
    return form?.displayRequiredErrors || false;
  },
}));

export const useFormErrorActions = () =>
  useFormErrorStore(state => ({
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

// Convenience hooks that work with form IDs
export const useFormErrors = (formId: string) =>
  useFormErrorStore(state => state.getFormErrors(formId));

export const useDisplayRequiredErrors = (formId: string) =>
  useFormErrorStore(state => state.getDisplayRequiredErrors(formId));

export const useFormFieldError = ({
  formId = '',
  fieldId,
  required = false,
  value,
  label,
}: {
  formId?: string;
  fieldId: string;
  required?: boolean;
  value: any;
  label: string;
}) => {
  const t = useTranslation();

  const { getErrorData, setError, registerField, unregisterField } =
    useFormErrorActions();
  const displayRequiredErrors = useDisplayRequiredErrors(formId);

  useEffect(() => {
    if (!formId || !fieldId) return;

    registerField(formId, fieldId);
    return () => unregisterField(formId, fieldId);
  }, [fieldId, formId]);

  const errorData = getErrorData(formId, fieldId);

  useEffect(() => {
    if (!formId || !fieldId) return;

    // todo custom errors
    // const { requiredError } = errorData;
    const { error } = errorData;

    if (required && !value) {
      setError(formId, fieldId, t('messages.required-field'), false);
    } else if (error !== null) {
      setError(formId, fieldId, null, false);
    }
  }, [value]);

  // Returning `isError`
  if (!formId || !fieldId) return false;
  return displayRequiredErrors && errorData.error !== null;
};

export const useForm = (formId: string) => {
  const { showRequiredErrors, resetRequiredErrors, hasErrors } =
    useFormErrorActions();

  return {
    showRequiredErrors: () => showRequiredErrors(formId),
    resetRequiredErrors: () => resetRequiredErrors(formId),
    hasErrors: () => hasErrors(formId),
  };
};

// Export the store directly for advanced usage
export { useFormErrorStore };
