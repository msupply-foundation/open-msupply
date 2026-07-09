import styles from './StatusChip.module.css'

export interface StatusChipProps {
  label: string
  /**
   * Any CSS colour — in practice always a `var(--status-*)` token (colour
   * literals live only in tokens.css). Carried by the dot and, tinted via
   * `color-mix`, the pill background — one value drives both.
   */
  colour: string
  class?: string
}

/*
 * Status chip — deliberately hand-rolled, pure CSS (Solid port of the RnD
 * prototype's StatusChip). A chip has no interaction or accessibility contract
 * to buy: it's a coloured dot + a label on a tinted pill. Mirrors the current
 * app's StatusChip (dot + pale background at low opacity). The label keeps the
 * normal text colour for AA contrast in both themes; the colour reads from the
 * dot + tint and never carries meaning alone — the label does.
 */
export const StatusChip = (props: StatusChipProps) => (
  <span
    class={props.class ? `${styles.chip} ${props.class}` : styles.chip}
    style={{ '--chip-colour': props.colour }}
  >
    <span class={styles.dot} aria-hidden="true" />
    {props.label}
  </span>
)
