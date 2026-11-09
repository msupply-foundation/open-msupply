import { splitProps, type JSX } from 'solid-js';
import { CheckIcon } from '../../icons';
import styles from './CheckboxButton.module.css';

export interface CheckboxButtonProps extends Omit<
  JSX.LabelHTMLAttributes<HTMLLabelElement>,
  'onChange'
> {
  /** Checked state — caller-owned; flip it in onChange. */
  checked: boolean;
  /** Fired when the control is clicked, with the NEXT checked state. */
  onChange: (checked: boolean) => void;
  /** The label beside the box. */
  children: JSX.Element;
  disabled?: boolean;
}

/*
 * CheckboxButton — a pill with a checkbox inside it: clicking anywhere on the
 * pill toggles the box (Open mSupply's on-hold control). A NATIVE
 * <input type="checkbox"> wrapped in its <label> — the input is visually
 * hidden but real, so assistive tech gets a true checkbox and the e2e
 * test-hook contract ("contains the checkbox <input>", e2e/TESTIDS.md) holds.
 * The caller owns the checked state and flips it in onChange. Space toggles it
 * (native checkbox semantics); focus ring drawn on the pill via :has().
 */
export const CheckboxButton = (props: CheckboxButtonProps) => {
  const [local, rest] = splitProps(props, [
    'checked',
    'onChange',
    'children',
    'class',
    'disabled',
  ]);
  return (
    <label
      class={local.class ? `${styles.button} ${local.class}` : styles.button}
      data-checked={local.checked ? '' : undefined}
      data-disabled={local.disabled ? '' : undefined}
      {...rest}
    >
      <input
        type="checkbox"
        class={styles.input}
        checked={local.checked}
        disabled={local.disabled}
        onChange={() => local.onChange(!local.checked)}
      />
      <span class={styles.box} aria-hidden="true">
        <CheckIcon class={styles.check} />
      </span>
      <span class={styles.label}>{local.children}</span>
    </label>
  );
};
