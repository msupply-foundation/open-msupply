import { splitProps, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import styles from './Text.module.css'

export type TextVariant = 'body' | 'bodySmall' | 'heading' | 'subtitle'
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export interface TextProps extends JSX.HTMLAttributes<HTMLElement> {
  /** The type style — size + line-height + weight only. Never colour. */
  variant?: TextVariant
  /**
   * Heading rank (`<h1>`–`<h6>`), for `variant="heading"` only. Decoupled from
   * the visual size (WCAG 2.2 / principle #9): pick the level that keeps the
   * document outline correct, not the one that "looks the right size". Ignored
   * once `as` is set. Defaults to 2 (a heading is usually the top of its region).
   */
  level?: HeadingLevel
  /** Render a different element without changing the visual style. */
  as?: string
}

/* Default element per variant. `heading` is overridden by `level` below. */
const DEFAULT_ELEMENT: Record<TextVariant, string> = {
  body: 'p',
  bodySmall: 'p',
  heading: 'h2',
  subtitle: 'p',
}

/*
 * Text — the shared type primitive. Deliberately hand-rolled, pure CSS: there's
 * no interaction or a11y contract to buy, just the app's four type styles
 * (body / bodySmall / heading / subtitle, ported from the current app's MUI
 * body1 / body2 / h6 / subtitle1 — see TEXT_SPEC_DRAFT.md).
 *
 * Two rules define its scope:
 *  - It sets size/line-height/weight only, NEVER colour — `color: inherit`, so
 *    the container decides (a cell's subtext is secondary because the CELL sets
 *    it, not because a variant is colour-locked). Colour lives with the context
 *    that owns the contrast/meaning responsibility.
 *  - Reach for it only where an area COMPOSES a variable arrangement of text
 *    (a SidePanel, a cell's main + subtext). A single fixed text role — a Button
 *    label, a table header `th` — stays styled by its own component and takes
 *    raw text; don't wrap that in <Text>.
 */
export const Text = (props: TextProps) => {
  const [local, rest] = splitProps(props, ['variant', 'level', 'as', 'class', 'children'])
  const variant = (): TextVariant => local.variant ?? 'body'
  const element = () =>
    local.as ??
    (variant() === 'heading' ? `h${local.level ?? 2}` : DEFAULT_ELEMENT[variant()])
  const cls = () =>
    local.class ? `${styles[variant()]} ${local.class}` : styles[variant()]

  return (
    <Dynamic component={element()} class={cls()} {...rest}>
      {local.children}
    </Dynamic>
  )
}
