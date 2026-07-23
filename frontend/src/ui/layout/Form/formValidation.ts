import { createMemo, createSignal, type Accessor } from 'solid-js';
import { t } from '../../../intl';

/**
 * One validation failure a form can surface. The form author writes these as an
 * explicit list computed from the draft (no field registry, no auto-discovery
 * — kdd/explicit-composition), so which rules exist and when they fire is
 * click-through traceable from the form itself.
 */
export interface FieldError {
  /** Ties the error to its input so a field can ask for its own message. */
  id: string;
  /** Human label listed in the summary. */
  label: string;
  /** Whether the rule is currently violated. */
  failed: boolean;
  /**
   * Message shown under the field and in the summary. Omit for a plain required
   * field — it defaults to the generic required message and the summary lists
   * the label alone.
   */
  message?: string;
  /**
   * Hold the error back until the form is armed (Save attempted). Defaults to
   * true for a required field (no message), false for a rule that carries a
   * message so a format/range error shows the moment it trips. Pass `true`
   * explicitly for a cross-field rule that is violated by the form's default
   * values (e.g. active-policy-needs-coverage) so it stays quiet on open.
   */
  showOnSubmit?: boolean;
}

const deferred = (e: FieldError): boolean =>
  e.showOnSubmit ?? e.message === undefined;

export interface FormValidation {
  /** Arm the form — call from the save handler before checking `valid()`. */
  arm: () => void;
  /** Disarm (an explicit reset/clear action, not per keystroke). */
  reset: () => void;
  /** Whether Save has been attempted. */
  armed: Accessor<boolean>;
  /** Message for an input's `error` prop, or undefined when that field is clean. */
  errorFor: (id: string) => string | undefined;
  /** The currently-visible errors, in author order — feed to FormErrorSummary. */
  visible: Accessor<FieldError[]>;
  /** True when nothing is failing — the gate the save handler checks. */
  valid: Accessor<boolean>;
}

/**
 * Coordinates a form's validation timing to the "quiet on open, full on Save"
 * behaviour: every rule is evaluated from the start, but required and
 * default-tripping errors stay hidden until the user attempts Save, while
 * format/range errors surface as soon as they trip. `errors` is a reactive
 * accessor the form recomputes from its draft; the returned reads are reactive,
 * so both the per-field `error` props and the summary update on their own.
 */
export const createFormValidation = (
  errors: Accessor<FieldError[]>
): FormValidation => {
  const [armed, setArmed] = createSignal(false);
  const visible = createMemo(() =>
    errors().filter(e => e.failed && (armed() || !deferred(e)))
  );
  return {
    arm: () => setArmed(true),
    reset: () => setArmed(false),
    armed,
    errorFor: id => {
      const e = visible().find(x => x.id === id);
      return e ? (e.message ?? t('error.field-required')) : undefined;
    },
    visible,
    valid: () => errors().every(e => !e.failed),
  };
};
