import styles from './Divider.module.css';

export interface DividerProps {
  class?: string;
  'data-testid'?: string;
}

/*
 * Divider — a hairline rule between two runs of content that belong to the
 * same region, where a heading would be too much (a form section's fields
 * split into two runs). A native `<hr>`, so assistive technology announces
 * the break as a separator. It sets no margin: the gap of the stack it sits
 * in spaces it, as it spaces the content either side. Hand-rolled, pure CSS +
 * tokens.
 */
export const Divider = (props: DividerProps) => (
  <hr
    class={props.class ? `${styles.divider} ${props.class}` : styles.divider}
    data-testid={props['data-testid']}
  />
);
