import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from '@common/intl';
import {
  selectVisibleError,
  useFormErrorStore,
  VisibleFieldError,
} from './store';
import { useFormId } from './FormIdProvider';

export type FormFieldOptions<T> = {
  formId?: string;
  fieldId: string;
  label: string;
  value: T;
  required?: boolean;
  /**
   * Optional synchronous validator. Called whenever `value` changes. Return a
   * non-null string to set a validation error, or null to clear.
   */
  validate?: (value: T) => string | null;
  /**
   * Reactive custom error. Set to a string to flag a custom error, or null to
   * clear. Custom errors take precedence over validation and required errors.
   */
  customError?: string | null;
};

export type FormFieldResult = {
  /**
   * `true` when there is an error that should be visually surfaced for this
   * field right now.
   */
  error: boolean;
  /**
   * The full visible error (kind + message + label), or null. Useful when a
   * component wants to render its own inline message.
   */
  visibleError: VisibleFieldError | null;
  /**
   * Imperative override for the custom error. Stable across renders.
   */
  setCustomError: (message: string | null) => void;
  /**
   * Imperative setter for validation errors. Components with internal
   * validation logic (e.g. NumericTextInput's min/max) call this.
   */
  setValidationError: (message: string | null) => void;
};

/**
 * Subscribe an input to the form-error store. Returns its visible error state
 * and stable setters. If `formId` is not supplied (and no FormIdProvider is in
 * the tree), this is a no-op — the input is opted out.
 */
export const useFormField = <T,>({
  formId: explicitFormId,
  fieldId,
  label,
  value,
  required = false,
  validate,
  customError = null,
}: FormFieldOptions<T>): FormFieldResult => {
  const formId = useFormId(explicitFormId);
  const t = useTranslation();
  const requiredMessage = t('messages.required-field');

  const isActive = !!formId && !!fieldId;
  const activeFormId = formId ?? '';

  // Actions are stable references created once by `create()`, so we can grab
  // them via getState() without subscribing — saves N subscriptions per input.
  const {
    registerField,
    unregisterField,
    setRequiredError: setStoreRequiredError,
    setValidationError: setStoreValidationError,
    setCustomError: setStoreCustomError,
    setLabel,
  } = useFormErrorStore.getState();

  // Subscribe to JUST this field's visible error. Selector returns equal
  // strings/objects for unchanged state, so other fields' updates don't cause
  // this hook's host to re-render.
  const visibleError = useFormErrorStore(state => {
    if (!isActive) return null;
    const form = state.forms[activeFormId];
    return selectVisibleError(form?.fields[fieldId], !!form?.showRequired);
  }, visibleErrorEquality);

  // Register / unregister
  useEffect(() => {
    if (!isActive) return;
    registerField(activeFormId, fieldId, label);
    return () => unregisterField(activeFormId, fieldId);
  }, [isActive, activeFormId, fieldId, registerField, unregisterField]);

  // Keep label in sync (cheap, idempotent).
  useEffect(() => {
    if (!isActive) return;
    setLabel(activeFormId, fieldId, label);
  }, [isActive, activeFormId, fieldId, label, setLabel]);

  // Required state — derive from `value`. We treat empty string, null, and
  // undefined as "missing"; everything else (including 0, false) counts.
  const isMissing = useMemo(() => isEmpty(value), [value]);
  useEffect(() => {
    if (!isActive) return;
    setStoreRequiredError(
      activeFormId,
      fieldId,
      required && isMissing ? requiredMessage : null
    );
  }, [
    isActive,
    activeFormId,
    fieldId,
    required,
    isMissing,
    requiredMessage,
    setStoreRequiredError,
  ]);

  // Run the validator on value change.
  const validateRef = useRef(validate);
  validateRef.current = validate;
  useEffect(() => {
    if (!isActive) return;
    const v = validateRef.current;
    if (!v) {
      setStoreValidationError(activeFormId, fieldId, null);
      return;
    }
    setStoreValidationError(activeFormId, fieldId, v(value));
  }, [isActive, activeFormId, fieldId, value, setStoreValidationError]);

  // Mirror the reactive customError prop into the store.
  useEffect(() => {
    if (!isActive) return;
    setStoreCustomError(activeFormId, fieldId, customError);
  }, [isActive, activeFormId, fieldId, customError, setStoreCustomError]);

  const setCustomError = useCallback(
    (message: string | null) => {
      if (!isActive) return;
      setStoreCustomError(activeFormId, fieldId, message);
    },
    [isActive, activeFormId, fieldId, setStoreCustomError]
  );

  const setValidationError = useCallback(
    (message: string | null) => {
      if (!isActive) return;
      setStoreValidationError(activeFormId, fieldId, message);
    },
    [isActive, activeFormId, fieldId, setStoreValidationError]
  );

  return {
    error: visibleError !== null,
    visibleError,
    setCustomError,
    setValidationError,
  };
};

const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || value === '';

const visibleErrorEquality = (
  a: VisibleFieldError | null,
  b: VisibleFieldError | null
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.kind === b.kind && a.message === b.message && a.label === b.label
  );
};
