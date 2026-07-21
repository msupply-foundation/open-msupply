import { children, Show, splitProps, type JSX } from 'solid-js';
import { createRipple } from '../../utils/createRipple';
import { Ripple } from './Ripple';
import styles from './Button.module.css';

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: JSX.Element;
  /**
   * Semantic tone (ui-standards #btn-variants). Never named after a colour —
   * the variant maps to palette tokens in the CSS (Carl, 2026-07-09):
   *   'primary'   (default) — the single most important action; filled.
   *   'secondary' — supporting actions (Print, Export, Cancel…); outlined.
   *   'ghost'     — optional/low-priority + inline table actions; text only.
   *   'danger'    — a strong "be careful with this" action (delete, void);
   *                 filled brand-orange tone, not a hard error-red.
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /**
   * Size (ui-standards #btn-sizes): 'medium' (default) for page/toolbar
   * actions, 'small' for dense tables and compact panels. Medium grows to the
   * touch target at tablet widths; small stays dense.
   */
  size?: 'medium' | 'small';
  /** Which side of the label the icon sits on (mirrors in RTL). */
  iconPosition?: 'start' | 'end';
  /**
   * Busy state: shows a spinner in place of the icon, disables the button and
   * marks it
   *  aria-busy (so a click can't re-fire an in-flight action). */
  loading?: boolean;
}

/*
 * Reusable action button — plain <button> + CSS, no component library. Flat
 * per ui-standards (#btn-variants): filled primary/danger, outlined secondary,
 * text-only ghost; two sizes; a subtle ripple on click (createRipple). Tone +
 * shape live entirely in Button.module.css; this file is just structure.
 */
export const Button = (props: ButtonProps) => {
  const [local, rest] = splitProps(props, [
    'icon',
    'variant',
    'size',
    'iconPosition',
    'loading',
    'children',
    'class',
    'type',
    'disabled',
    'onPointerDown',
  ]);
  const ripple = createRipple();
  // JSX-element props are lazy getters: each is read twice below (the <Show>
  // test + the insertion), and raw reads would create the passed element twice
  // per evaluation — resolve once (kdd/solid-reactivity-pitfalls §3).
  const icon = children(() => local.icon);
  const label = children(() => local.children);

  return (
    <button
      type={local.type ?? 'button'}
      class={local.class ? `${styles.button} ${local.class}` : styles.button}
      data-variant={local.variant ?? 'primary'}
      data-size={local.size ?? 'medium'}
      data-icon-position={local.iconPosition ?? 'start'}
      disabled={local.disabled || local.loading}
      aria-busy={local.loading || undefined}
      onPointerDown={event => {
        if (local.loading) return;
        ripple.onPointerDown(event);
        if (typeof local.onPointerDown === 'function')
          local.onPointerDown(event);
      }}
      {...rest}
    >
      {/* Spinner replaces the icon while loading. */}
      <Show
        when={local.loading}
        fallback={
          <Show when={icon()}>
            <span class={styles.icon}>{icon()}</span>
          </Show>
        }
      >
        <span class={styles.spinner} aria-hidden="true" />
      </Show>
      <Show when={label()}>
        <span class={styles.label}>{label()}</span>
      </Show>
      <Ripple ripples={ripple.ripples()} onDone={ripple.dismiss} />
    </button>
  );
};
