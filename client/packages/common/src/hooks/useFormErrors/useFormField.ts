import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from '@common/intl';
import { isEqual } from '@common/utils';
import {
  selectVisibleError,
  useFormErrorStore,
  VisibleFieldError,
} from './store';

/**
 * A custom error can be expressed two ways:
 *
 *   - `'message'` — shown immediately, like an inline validation error.
 *   - `{ message, showOnSubmit: true }` — held back until the form's required
 *     errors are shown (i.e. after the user attempts Save).
 *
 * The `showOnSubmit` opt-in only exists on `customError` and not on
 * `validate`. That's deliberate: `validate` is per-field and only sees that
 * one field's value, so on a fresh form the field is empty and the callback
 * returns null — there's no "error visible before the user has done
 * anything" problem to fix. `customError`, in contrast, is computed from the
 * whole draft and can fire on default values (e.g. an "active && coverage=0"
 * cross-field rule that trips before the user has interacted with anything).
 * Those are the cases that need deferring; deferring `validate` would just
 * be dead surface area.
 */
export type CustomErrorValue =
  | string
  | { message: string; showOnSubmit?: boolean }
  | null;

export type FormFieldOptions<T> = {
  formId: string;
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
   * Reactive custom error — `string` (shown immediately) or `{ message,
   * showOnSubmit: true }` (deferred until the form's required errors are
   * revealed). Custom errors take precedence over validation and required
   * errors when shown.
   */
  customError?: CustomErrorValue;
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
 * and stable setters. If `formId` or `fieldId` are empty strings, this is a
 * no-op — the input is opted out.
 */
export const useFormField = <T,>({
  formId,
  fieldId,
  label,
  value,
  required = false,
  validate,
  customError = null,
}: FormFieldOptions<T>): FormFieldResult => {
  const t = useTranslation();
  const requiredMessage = t('messages.required-field');

  const isActive = !!formId && !!fieldId;
  const activeFormId = formId;

  // Actions are stable references created once by `create()`, so we can grab
  // them via getState() without subscribing — saves N subscriptions per input.
  const {
    registerField,
    unregisterField,
    setRequiredError: setStoreRequiredError,
    setValidationError: setStoreValidationError,
    setCustomError: setStoreCustomError,
    setSubmissionError: setStoreSubmissionError,
    setLabel,
  } = useFormErrorStore.getState();

  // Subscribe to JUST this field's visible error. Selector returns equal
  // strings/objects for unchanged state, so other fields' updates don't cause
  // this hook's host to re-render.
  const visibleError = useFormErrorStore(state => {
    if (!isActive) return null;
    const form = state.forms[activeFormId];
    return selectVisibleError(form?.fields[fieldId], !!form?.showRequired);
  }, isEqual);

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

  // Mirror the reactive customError prop into the store. The string form
  // routes to `customError` (shown immediately); the object form with
  // `showOnSubmit: true` routes to `submissionError` instead, which is gated
  // by the form's `showRequired` flag. Whichever slot we're not using gets
  // cleared, so flipping `showOnSubmit` between renders behaves correctly.
  const { customMessage, submissionMessage } = normaliseCustomError(customError);
  useEffect(() => {
    if (!isActive) return;
    setStoreCustomError(activeFormId, fieldId, customMessage);
    setStoreSubmissionError(activeFormId, fieldId, submissionMessage);
  }, [
    isActive,
    activeFormId,
    fieldId,
    customMessage,
    submissionMessage,
    setStoreCustomError,
    setStoreSubmissionError,
  ]);

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

const normaliseCustomError = (
  customError: CustomErrorValue | undefined
): { customMessage: string | null; submissionMessage: string | null } => {
  if (!customError) return { customMessage: null, submissionMessage: null };
  if (typeof customError === 'string') {
    return { customMessage: customError, submissionMessage: null };
  }
  if (customError.showOnSubmit) {
    return { customMessage: null, submissionMessage: customError.message };
  }
  return { customMessage: customError.message, submissionMessage: null };
};
