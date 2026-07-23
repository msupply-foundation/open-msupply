import { For, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Alert } from '../../elements/feedback/Alert';
import type { FieldError } from './formValidation';
import styles from './FormErrorSummary.module.css';

export interface FormErrorSummaryProps {
  /** The form's currently-visible errors (FormValidation.visible()). */
  errors: FieldError[];
  /** `data-testid` for the summary panel (locale-stable, e2e/TESTIDS.md). */
  testId?: string;
}

/**
 * Red summary of a form's outstanding errors, or nothing when clean. Dropped
 * once below the form body and paired with createFormValidation, it lists each
 * visible error — a plain required field by its label, a rule with a message by
 * "label: message". Because it renders the same `visible()` list the per-field
 * errors read, the two never disagree, and it shrinks field-by-field as the
 * user fixes each one.
 */
export const FormErrorSummary: Component<FormErrorSummaryProps> = props => (
  <Show when={props.errors.length > 0}>
    <Alert severity="error" class={styles.summary} testId={props.testId}>
      <span>{t('messages.form-has-errors')}</span>
      <ul class={styles.list}>
        <For each={props.errors}>
          {e => <li>{e.message ? `${e.label}: ${e.message}` : e.label}</li>}
        </For>
      </ul>
    </Alert>
  </Show>
);
