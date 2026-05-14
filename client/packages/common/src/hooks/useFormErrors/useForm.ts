import { useCallback, useEffect } from 'react';
import { useFormErrorStore } from './store';

export type UseFormResult = {
  /** Reveal `kind: 'required'` errors in the summary and on inputs. */
  showRequired: () => void;
  /**
   * Hide already-shown required errors again — only for explicit "Reset
   * form" affordances. Don't call from input handlers; required errors
   * should stay visible after a Save attempt and clear per-field as their
   * values are filled in.
   */
  resetRequired: () => void;
  /** True if the form currently has at least one visible error. */
  hasErrors: () => boolean;
  /** Manually clear the form's state. */
  clear: () => void;
};

/**
 * Form-level coordination. Call this once near the top of the form (e.g. in
 * the modal component). On unmount the form's state is cleared so that the
 * next time the form opens it starts fresh.
 *
 * Pass `persist: true` for forms that legitimately stay mounted across
 * navigation and shouldn't reset.
 */
export const useForm = (
  formId: string,
  options?: { persist?: boolean }
): UseFormResult => {
  const persist = options?.persist ?? false;

  // Actions are stable; access without subscribing.
  const { showRequiredErrors, resetRequiredErrors, clearForm } =
    useFormErrorStore.getState();

  useEffect(() => {
    if (persist) return;
    return () => {
      clearForm(formId);
    };
  }, [formId, persist, clearForm]);

  const showRequired = useCallback(
    () => showRequiredErrors(formId),
    [formId, showRequiredErrors]
  );
  const resetRequired = useCallback(
    () => resetRequiredErrors(formId),
    [formId, resetRequiredErrors]
  );
  const clear = useCallback(() => clearForm(formId), [formId, clearForm]);

  // hasErrors reads on demand — don't subscribe. Caller should use
  // `useHasErrors(formId)` if they want a reactive value.
  const hasErrors = useCallback(
    () => useFormErrorStore.getState().hasVisibleErrors(formId),
    [formId]
  );

  return { showRequired, resetRequired, hasErrors, clear };
};

/**
 * Reactive subscription to whether a form has any visible errors. Useful for
 * disabling a Save button. Delegates to the store's `hasVisibleErrors` so
 * precedence/visibility rules are defined in exactly one place.
 */
export const useHasErrors = (formId: string): boolean =>
  useFormErrorStore(state => state.hasVisibleErrors(formId));
