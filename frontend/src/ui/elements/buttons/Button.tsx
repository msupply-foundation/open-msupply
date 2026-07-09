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
    'children',
    'class',
    'type',
    'onPointerDown',
  ])
  const ripple = createRipple()

  return (
    <button
      type={local.type ?? 'button'}
      class={local.class ? `${styles.button} ${local.class}` : styles.button}
      data-variant={local.variant ?? 'primary'}
      data-icon-position={local.iconPosition ?? 'start'}
      onPointerDown={event => {
        ripple.onPointerDown(event)
        if (typeof local.onPointerDown === 'function')
          local.onPointerDown(event)
      }}
      {...rest}
    >
      <Show when={local.icon}>
        <span class={styles.icon}>{local.icon}</span>
      </Show>
      <Show when={local.children}>
        <span class={styles.label}>{local.children}</span>
      </Show>
      <Ripple ripples={ripple.ripples()} onDone={ripple.dismiss} />
    </button>
  )
}
