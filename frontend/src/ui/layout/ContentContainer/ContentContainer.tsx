import { splitProps, type JSX } from 'solid-js';
import styles from './ContentContainer.module.css';

export interface ContentContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * The reading-column cap this content grows to before it stops widening and
   * centres in the page body:
   *  - `form` (default) — a comfortable two-column form (`--measure-form`)
   *  - `prose` — single-column reading text (`--measure-prose`)
   *  - `wide` — dense forms / dashboards (`--measure-wide`)
   */
  size?: 'form' | 'prose' | 'wide';
}

/*
 * ContentContainer — the CONTENT MEASURE (see kdd/form-layout). A centred
 * reading column that caps how wide its content grows so a form or a block of
 * prose stays readable on a wide monitor instead of sprawling edge to edge.
 *
 * Owns ONLY max-inline-size + auto inline margins — NOT padding. The Page
 * frame's body already owns the edge padding (Page.module.css), so measure is
 * a CONTENT choice a section opts into, not frame geometry: a table page skips
 * it (full-bleed via Page `fillBody`), a form page wraps its body in one. Pure
 * layout, no styling of what's inside. Hand-rolled, pure CSS + tokens.
 */
export const ContentContainer = (props: ContentContainerProps) => {
  const [local, rest] = splitProps(props, ['size', 'class', 'children']);
  return (
    <div
      class={
        local.class ? `${styles.container} ${local.class}` : styles.container
      }
      data-size={local.size ?? 'form'}
      {...rest}
    >
      {local.children}
    </div>
  );
};
