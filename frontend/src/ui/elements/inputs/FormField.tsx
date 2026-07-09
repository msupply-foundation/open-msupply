import { Show } from 'solid-js';
import type { Component } from 'solid-js';
import styles from '../../styles/shared.module.css';

// A labelled input owning its full markup — wrapper, label, input, error line —
// so forms compose fields explicitly (kdd/explicit-composition).
export const FormField: Component<{
  id: string;
  label: string;
  value: string;
  onInput?: (value: string) => void;
  error?: string;
  type?: 'text' | 'password';
  disabled?: boolean;
}> = props => (
  <div class={styles.field}>
    <label for={props.id}>{props.label}</label>
    <input
      id={props.id}
      class={styles.input}
      type={props.type ?? 'text'}
      value={props.value}
      disabled={props.disabled}
      onInput={e => props.onInput?.(e.currentTarget.value)}
    />
    <Show when={props.error}>
      <span class={styles.errorText}>{props.error}</span>
    </Show>
  </div>
);
