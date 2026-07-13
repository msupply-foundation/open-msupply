import { Show, splitProps, type JSX } from 'solid-js'
import { createRipple } from '../../utils/createRipple'
import { Ripple } from './Ripple'
import styles from './Button.module.css'

export interface ButtonProps
  extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: JSX.Element
  /**
   * Semantic tone: 'primary' (default — the brand tone) or 'secondary' (the
   * action tone; footer edit actions). Never named after a colour — the
   * variant maps to palette tokens in the CSS (Carl, 2026-07-09).
   */
  variant?: 'primary' | 'secondary'
  /** Which side of the label the icon sits on (mirrors in RTL). */
  iconPosition?: 'start' | 'end'
  /** Busy state: shows a spinner in place of the icon, disables the button and marks it
   *  aria-busy (so a click can't re-fire an in-flight action). */
  loading?: boolean
}

/*
 * Reusable action button — plain <button> + CSS, no component library (Solid
 * port of the RnD prototype's <Button>). Mirrors the current app's outlined
 * ButtonWithIcon: white pill, no border, shadow[2], coloured icon; fills with
 * its colour on hover (text + icon go white); a subtle ripple on click
 * (createRipple). `variant` picks the tone: primary (brand) or secondary
 * (footer actions).
 */
export const Button = (props: ButtonProps) => {
  const [local, rest] = splitProps(props, [
    'icon',
    'variant',
    'iconPosition',
    'loading',
    'children',
    'class',
    'type',
    'disabled',
    'onPointerDown',
  ])
  const ripple = createRipple()

  return (
    <button
      type={local.type ?? 'button'}
      class={local.class ? `${styles.button} ${local.class}` : styles.button}
      data-variant={local.variant ?? 'primary'}
      data-icon-position={local.iconPosition ?? 'start'}
      disabled={local.disabled || local.loading}
      aria-busy={local.loading || undefined}
      onPointerDown={event => {
        if (local.loading) return
        ripple.onPointerDown(event)
        if (typeof local.onPointerDown === 'function')
          local.onPointerDown(event)
      }}
      {...rest}
    >
      {/* Spinner replaces the icon while loading. */}
      <Show when={local.loading} fallback={<Show when={local.icon}><span class={styles.icon}>{local.icon}</span></Show>}>
        <span class={styles.spinner} aria-hidden="true" />
      </Show>
      <Show when={local.children}>
        <span class={styles.label}>{local.children}</span>
      </Show>
      <Ripple ripples={ripple.ripples()} onDone={ripple.dismiss} />
    </button>
  )
}
