import { splitProps, Show, type JSX } from 'solid-js';
import { Text } from '../../elements/typography/Text';
import styles from './IdentityHeader.module.css';

// `title` is omitted from the base so the prop can take JSX (the native
// `title` attribute is a string tooltip — not something this header wants).
export interface IdentityHeaderProps extends Omit<
  JSX.HTMLAttributes<HTMLElement>,
  'title'
> {
  /**
   * The record's name — the header's heading. JSX so a caller can render it
   * as a link (e.g. an item name linking to its catalogue record).
   */
  title: JSX.Element;
  /**
   * One muted line of secondary identity facts beneath the name
   * ("Code: 358b04bf · Unit: bottle").
   */
  subtitle?: JSX.Element;
}

/*
 * IdentityHeader — the record-identity header atop a sectioned edit form
 * (spec/ui-standards detail-views): the record's NAME as the region heading,
 * with an optional muted subtitle of secondary identity facts. The heading
 * rank is fixed at h2 (a region heading under the page's breadcrumb h1) — no
 * rank knob until a second context genuinely needs one. Owns the subtitle's
 * colour (Text never carries colour — the context that owns the meaning owns
 * the colour, as LabelledValue does). Hand-rolled, pure CSS + tokens.
 */
export const IdentityHeader = (props: IdentityHeaderProps) => {
  const [local, rest] = splitProps(props, ['title', 'subtitle', 'class']);
  return (
    <header
      class={local.class ? `${styles.header} ${local.class}` : styles.header}
      {...rest}
    >
      <Text variant="heading" level={2}>
        {local.title}
      </Text>
      <Show when={local.subtitle}>
        <Text variant="subtitle" class={styles.subtitle}>
          {local.subtitle}
        </Text>
      </Show>
    </header>
  );
};
