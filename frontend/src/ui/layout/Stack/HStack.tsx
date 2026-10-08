import { splitProps, type JSX } from 'solid-js';
import styles from './HStack.module.css';

export interface HStackProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * The rhythm between children: `sm` (--space-2), `md` (--space-4, default),
   * `lg` (--space-6) — the same presets as Stack, so a row and a column share
   * one gap vocabulary. A preset, not a length.
   */
  gap?: 'sm' | 'md' | 'lg';
  /**
   * Cross-axis (vertical) alignment of children. Default `center` — the
   * dominant case (an affordance sitting centred against its text/value).
   */
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  /**
   * Main-axis (horizontal) distribution. Default `start` (children packed at
   * the inline-start); `between` spreads them to the edges.
   */
  justify?: 'start' | 'center' | 'end' | 'between';
  /** Let children wrap onto further lines instead of overflowing. */
  wrap?: boolean;
}

/*
 * HStack — a horizontal run of siblings with a consistent gap: the generic
 * "value + affordance" row / button cluster that ISN'T one of the semantic
 * horizontal owners (FormRow, HeaderButtons, ContentFooterActions, CardGrid —
 * reach for those first). Block-level and full-width like Stack, so `justify`
 * has room to work; children pack at the inline-start and centre vertically by
 * default. If a genuine shrink-to-content need arises, add an `inline` opt-in
 * then rather than pre-building it. Pure layout, hand-rolled CSS + tokens.
 * Stack's sibling.
 */
export const HStack = (props: HStackProps) => {
  const [local, rest] = splitProps(props, [
    'gap',
    'align',
    'justify',
    'wrap',
    'class',
    'children',
  ]);
  return (
    <div
      class={local.class ? `${styles.hstack} ${local.class}` : styles.hstack}
      data-gap={local.gap ?? 'md'}
      data-align={local.align ?? 'center'}
      data-justify={local.justify ?? 'start'}
      data-wrap={local.wrap ? '' : undefined}
      {...rest}
    >
      {local.children}
    </div>
  );
};
