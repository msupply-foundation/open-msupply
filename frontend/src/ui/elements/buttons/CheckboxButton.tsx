import { splitProps, type JSX } from 'solid-js';
import { CheckIcon } from '../../icons';
import styles from './CheckboxButton.module.css';

export interface CheckboxButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  /** Checked state — caller-owned; flip it in onChange. */
  checked: boolean;
  /** Fired when the button is clicked, with the NEXT checked state. */
  onChange: (checked: boolean) => void;
  /** The label beside the box. */
  children: JSX.Element;
}

/*
 * CheckboxButton — a pill button with a checkbox inside it: clicking anywhere on the button
 * toggles the box (Open mSupply's on-hold control). It IS a checkbox to assistive tech
 * (role="checkbox" + aria-checked), rendered as a button-shaped target so the whole pill is
 * clickable — the "own the simple" way to get OMS's look without a library. The caller owns the
 * checked state and flips it in onChange. Space/Enter toggle it (native <button>).
 */
export const CheckboxButton = (props: CheckboxButtonProps) => {
  const [local, rest] = splitProps(props, ['checked', 'onChange', 'children', 'class']);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={local.checked}
      data-checked={local.checked ? '' : undefined}
      class={local.class ? `${styles.button} ${local.class}` : styles.button}
      onClick={() => local.onChange(!local.checked)}
      {...rest}
    >
      <span class={styles.box} aria-hidden="true">
        <CheckIcon class={styles.check} />
      </span>
      <span class={styles.label}>{local.children}</span>
    </button>
  );
};
