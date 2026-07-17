import { Show, splitProps, type JSX } from 'solid-js';
import styles from './Checkbox.module.css';

export interface CheckboxProps extends Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'type' | 'checked'
> {
  /** The label beside the box. */
  label: string;
  /** Optional muted second line under the label. */
  description?: string;
  /** Checked state — caller-owned; flip it in onChange. */
  checked: boolean;
  /** Fired on toggle, with the NEXT checked state. */
  onChange: (checked: boolean) => void;
}

/*
 * Plain form checkbox — the plain browser <input type="checkbox"> (NO headless
 * library), the same "own the simple" call as RadioGroup: the native control
 * gives the checkbox role, Space toggling and checked announcement for free;
 * we style it with `accent-color` (the brand orange fill) and lay the label —
 * with an optional muted description — beside it. Wrapping <label> makes the
 * whole row the click target, no id/for wiring needed. The caller owns
 * `checked` and flips it in `onChange`.
 *
 * This is the bare form control; the pill-shaped toggle-with-a-label-inside is
 * CheckboxButton (buttons/), and the table row-selection checkbox is
 * DataTable's own.
 */
export const Checkbox = (props: CheckboxProps) => {
  const [local, rest] = splitProps(props, [
    'label',
    'description',
    'checked',
    'onChange',
    'class',
  ]);
  return (
    <label
      class={local.class ? `${styles.item} ${local.class}` : styles.item}
      data-disabled={rest.disabled ? '' : undefined}
    >
      <input
        type="checkbox"
        class={styles.input}
        checked={local.checked}
        onChange={e => local.onChange(e.currentTarget.checked)}
        {...rest}
      />
      <div class={styles.text}>
        <span class={styles.label}>{local.label}</span>
        <Show when={local.description}>
          <span class={styles.description}>{local.description}</span>
        </Show>
      </div>
    </label>
  );
};
