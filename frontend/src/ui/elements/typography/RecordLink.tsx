import { A } from '@solidjs/router';
import { splitProps, type ComponentProps, type JSX } from 'solid-js';
import styles from './RecordLink.module.css';

/**
 * The record kinds that carry a brand tone. Omit `kind` for a neutral
 * reference (a related record with no brand kind-colour).
 */
export type RecordLinkKind = 'po' | 'io';

export interface RecordLinkProps extends ComponentProps<typeof A> {
  /**
   * The target record's route; navigated via the router's `<A>` (SPA, no
   * reload).
   */
  href: string;
  /**
   * The kind of record, which sets the link's tone: `po` (purchase order →
   * secondary/blue) or `io` (internal order / requisition → primary/orange).
   * Omit for a neutral reference (e.g. a linked shipment). The kind must also
   * read in the LABEL text (`PO-011`, `IO-095`, `#1234`) so colour is never the
   * only cue (a11y).
   */
  kind?: RecordLinkKind;
  /** Stamped as `data-testid` when set. */
  testId?: string;
}

/*
 * RecordLink — a kind-toned link to a related record (a purchase order,
 * internal order, requisition, shipment…). One shared treatment for the "open
 * this related record" reference that was hand-rolled three ways across
 * inbound/outbound/customer-returns. It IS a router `<A>`; what it adds is the
 * kind → tone mapping and the guarantee that colour is a redundant cue (the
 * kind lives in the label text). Weight, size and the rest inherit from the
 * surrounding context. Ports the inbound linkedOrder pattern (DESIGN_STANDARDS
 * Unit 7) into the library.
 */
export const RecordLink = (props: RecordLinkProps): JSX.Element => {
  const [local, rest] = splitProps(props, [
    'kind',
    'testId',
    'class',
    'children',
  ]);
  return (
    <A
      {...rest}
      class={local.class ? `${styles.link} ${local.class}` : styles.link}
      data-kind={local.kind}
      data-testid={local.testId}
    >
      {local.children}
    </A>
  );
};
