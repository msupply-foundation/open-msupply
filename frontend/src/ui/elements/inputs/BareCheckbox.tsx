import { createEffect, splitProps } from 'solid-js';
import type { ComponentProps } from 'solid-js';
import { CheckIcon, MinusIcon } from '../../icons';
import styles from './BareCheckbox.module.css';

export type BareCheckboxProps = {
  /**
   * Tri-state (a table's select-all): shows the dash glyph and sets the DOM
   * `indeterminate` PROPERTY (it isn't an attribute, so a ref'd effect).
   */
  indeterminate?: boolean;
  /** Error look on the box (the labelled Checkbox's error state). */
  error?: boolean;
  /** Class on the ROOT (placement — margins/centring); the look is fixed. */
  class?: string;
} & Omit<ComponentProps<'input'>, 'type' | 'class'>;

/*
 * BareCheckbox — THE checkbox control: the one box every checkbox in the app
 * renders, labelled or not (one look by construction, not by keeping CSS in
 * sync). The native <input type="checkbox"> is the state owner — kept for
 * semantics, Space, forms and e2e (test ids target it) — stretched invisibly
 * over the drawn box so it IS the click target; the box + glyphs (CheckIcon /
 * MinusIcon, the same icons everywhere) are presentational siblings driven by
 * :checked/:indeterminate/:focus-visible.
 *
 * Composition: Checkbox (labelled form field) wraps this in a <label> with
 * label/error chrome; the DataTable renders it bare in selection cells with
 * an aria-label. Callers needing a label must provide one (wrap or aria).
 */
export const BareCheckbox = (props: BareCheckboxProps) => {
  const [local, inputProps] = splitProps(props, [
    'indeterminate',
    'error',
    'class',
  ]);
  return (
    <span class={local.class ? `${styles.root} ${local.class}` : styles.root}>
      <input
        type="checkbox"
        class={styles.input}
        ref={el =>
          createEffect(() => {
            el.indeterminate = local.indeterminate ?? false;
          })
        }
        {...inputProps}
      />
      <span
        class={styles.box}
        data-error={local.error ? '' : undefined}
        aria-hidden="true"
      >
        <CheckIcon class={styles.check} />
        <MinusIcon class={styles.dash} />
      </span>
    </span>
  );
};
