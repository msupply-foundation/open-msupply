import { createWithEqualityFn as create } from 'zustand/traditional';

export type ErrorKind = 'required' | 'invalid' | 'custom' | 'submission';

export type VisibleFieldError = {
  kind: ErrorKind;
  message: string;
  label: string;
};

type FieldEntry = {
  label: string;
  // Custom error shown immediately. For rules where the user-visible message
  // shouldn't appear until they attempt to submit (e.g. cross-field rules
  // that trip on default values), use submissionError instead.
  customError: string | null;
  // Custom error deferred until showRequired is set, like requiredError.
  submissionError: string | null;
  validationError: string | null;
  requiredError: string | null;
};

type FormState = {
  fields: Record<string, FieldEntry>;
  showRequired: boolean;
};

type StoreState = {
  forms: Record<string, FormState>;
};

type StoreActions = {
  registerField: (formId: string, fieldId: string, label: string) => void;
  unregisterField: (formId: string, fieldId: string) => void;
  setRequiredError: (
    formId: string,
    fieldId: string,
    message: string | null
  ) => void;
  setValidationError: (
    formId: string,
    fieldId: string,
    message: string | null
  ) => void;
  setCustomError: (
    formId: string,
    fieldId: string,
    message: string | null
  ) => void;
  setSubmissionError: (
    formId: string,
    fieldId: string,
    message: string | null
  ) => void;
  setLabel: (formId: string, fieldId: string, label: string) => void;
  showRequiredErrors: (formId: string) => void;
  resetRequiredErrors: (formId: string) => void;
  clearForm: (formId: string) => void;
  hasVisibleErrors: (formId: string) => boolean;
};

export type FormErrorStore = StoreState & StoreActions;

const emptyForm = (): FormState => ({ fields: {}, showRequired: false });

const updateField = (
  state: StoreState,
  formId: string,
  fieldId: string,
  updater: (entry: FieldEntry) => FieldEntry
): StoreState => {
  const form = state.forms[formId];
  if (!form) return state;
  const entry = form.fields[fieldId];
  if (!entry) return state;
  const next = updater(entry);
  if (next === entry) return state;
  return {
    forms: {
      ...state.forms,
      [formId]: {
        ...form,
        fields: { ...form.fields, [fieldId]: next },
      },
    },
  };
};

export const useFormErrorStore = create<FormErrorStore>((set, get) => ({
  forms: {},

  registerField: (formId, fieldId, label) => {
    set(state => {
      const existingForm = state.forms[formId] ?? emptyForm();
      const existingField = existingForm.fields[fieldId];
      // If the field already exists (e.g. component re-mounted under same id),
      // keep its current error state but update label.
      const nextField: FieldEntry = existingField
        ? { ...existingField, label }
        : {
            label,
            customError: null,
            submissionError: null,
            validationError: null,
            requiredError: null,
          };
      return {
        forms: {
          ...state.forms,
          [formId]: {
            ...existingForm,
            fields: { ...existingForm.fields, [fieldId]: nextField },
          },
        },
      };
    });
  },

  unregisterField: (formId, fieldId) => {
    set(state => {
      const form = state.forms[formId];
      if (!form || !(fieldId in form.fields)) return state;
      const { [fieldId]: _removed, ...rest } = form.fields;
      return {
        forms: {
          ...state.forms,
          [formId]: { ...form, fields: rest },
        },
      };
    });
  },

  setRequiredError: (formId, fieldId, message) => {
    set(state =>
      updateField(state, formId, fieldId, entry => {
        if (entry.requiredError === message) return entry;
        return { ...entry, requiredError: message };
      })
    );
  },

  setValidationError: (formId, fieldId, message) => {
    set(state =>
      updateField(state, formId, fieldId, entry => {
        if (entry.validationError === message) return entry;
        return { ...entry, validationError: message };
      })
    );
  },

  setCustomError: (formId, fieldId, message) => {
    set(state =>
      updateField(state, formId, fieldId, entry => {
        if (entry.customError === message) return entry;
        return { ...entry, customError: message };
      })
    );
  },

  setSubmissionError: (formId, fieldId, message) => {
    set(state =>
      updateField(state, formId, fieldId, entry => {
        if (entry.submissionError === message) return entry;
        return { ...entry, submissionError: message };
      })
    );
  },

  setLabel: (formId, fieldId, label) => {
    set(state =>
      updateField(state, formId, fieldId, entry => {
        if (entry.label === label) return entry;
        return { ...entry, label };
      })
    );
  },

  showRequiredErrors: formId => {
    set(state => {
      const form = state.forms[formId];
      if (!form || form.showRequired) return state;
      return {
        forms: { ...state.forms, [formId]: { ...form, showRequired: true } },
      };
    });
  },

  resetRequiredErrors: formId => {
    set(state => {
      const form = state.forms[formId];
      if (!form || !form.showRequired) return state;
      return {
        forms: { ...state.forms, [formId]: { ...form, showRequired: false } },
      };
    });
  },

  clearForm: formId => {
    set(state => {
      if (!(formId in state.forms)) return state;
      const { [formId]: _removed, ...rest } = state.forms;
      return { forms: rest };
    });
  },

  hasVisibleErrors: formId => {
    const form = get().forms[formId];
    if (!form) return false;
    const showRequired = form.showRequired;
    return Object.values(form.fields).some(entry => {
      if (entry.customError) return true;
      if (entry.validationError) return true;
      if (showRequired && entry.submissionError) return true;
      if (showRequired && entry.requiredError) return true;
      return false;
    });
  },
}));

/**
 * Compute the highest-priority visible error for a single field. Used by both
 * the per-field hook and the summary display so that they agree on what's
 * shown. Precedence: custom > invalid > submission > required.
 *
 * `submission` and `required` are both gated by `showRequired` — they're
 * tracked from the start but only surfaced after the user attempts Save.
 */
export const selectVisibleError = (
  field: FieldEntry | undefined,
  showRequired: boolean
): VisibleFieldError | null => {
  if (!field) return null;
  if (field.customError) {
    return { kind: 'custom', message: field.customError, label: field.label };
  }
  if (field.validationError) {
    return {
      kind: 'invalid',
      message: field.validationError,
      label: field.label,
    };
  }
  if (showRequired && field.submissionError) {
    return {
      kind: 'submission',
      message: field.submissionError,
      label: field.label,
    };
  }
  if (showRequired && field.requiredError) {
    return {
      kind: 'required',
      message: field.requiredError,
      label: field.label,
    };
  }
  return null;
};

/**
 * Internal accessor used by hooks/tests — exported for advanced use only.
 */
export const _internal = {
  getField: (formId: string, fieldId: string) =>
    useFormErrorStore.getState().forms[formId]?.fields[fieldId],
  getForm: (formId: string) => useFormErrorStore.getState().forms[formId],
};
