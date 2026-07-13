import { splitProps, type JSX } from 'solid-js';
import { Text } from './Text';
import styles from './LabelledValue.module.css';

export interface LabelledValueProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** The field name, shown small + muted ABOVE the value. */
  label: JSX.Element;
  /** The value, shown below the label in body text. Pass any node (text, a chip, etc.). */
  children: JSX.Element;
}

/*
 * A read-only label-above-value pair — the field unit in a card's detail region and in
 * detail/side panels (ui-standards § tables, card layout: labels muted above values).
 * Stacked (label on top), so a row of these WRAPS intrinsically (CLAUDE.md #7) rather than
 * forcing a fixed grid. Composes <Text> for type only (bodySmall label / body value); the
 * colours are set here (label secondary, value body) — Text never carries colour.
 *
 * Deliberately hand-rolled, pure CSS — no interaction/a11y contract to buy. A plain block
 * (not a <dl>): key-value-as-description-list is optional for read-only display, and a bare
 * block wraps and reuses more freely.
 */
export const LabelledValue = (props: LabelledValueProps) => {
  const [local, rest] = splitProps(props, ['label', 'children', 'class']);
  return (
    <div class={local.class ? `${styles.field} ${local.class}` : styles.field} {...rest}>
      <Text variant="bodySmall" as="span" class={styles.label}>
        {local.label}
      </Text>
      <Text variant="body" as="span" class={styles.value}>
        {local.children}
      </Text>
    </div>
  );
};
