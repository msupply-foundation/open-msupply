import type { JSX } from 'solid-js';
import { documentHref } from '../../../nav/storeRelativePath';
import { isPlainClick } from '../../utils/linkClick';
import styles from './DataTable.module.css';

/*
 * A row's link (#271): what lets a list row that opens a record be opened in a
 * new tab — right-click → "Open link in new tab" / "Copy link address",
 * Cmd/Ctrl-click, Shift-click, middle-click — the way every other link in the
 * browser can.
 *
 * A <tr> cannot be an <a>, and wrapping each cell's content in one would put
 * controls inside a link (invalid, and a click on them would follow it) and
 * make every cell announce as a link. So the link is an empty OVERLAY in each
 * cell it covers (and on a card), filling the cell behind its content:
 *
 *   - The cell (`data-row-link`) turns its own pointer events off and the
 *     link's on, so a pointer anywhere in the cell — text included — lands on
 *     the link, and the browser offers its link menu there. Controls in the
 *     cell (a button, a checkbox, a real link) turn theirs back on and sit
 *     above it, so they keep working exactly as before. The CSS is
 *     DataTable.module.css's (`[data-row-link]`).
 *   - It is out of the tab order and hidden from assistive tech: the row is
 *     already the keyboard's target (arrows + Enter, KB-N1) and reads as a row
 *     of cells, not N copies of one link.
 *   - It carries no handler of its own. A click bubbles to the row, which asks
 *     `leftToBrowser` whose click it is.
 *
 * `href` is router-space — the same string the row's handler hands
 * `navigate()` — and the mount is put in front here, because a new tab or a
 * copied address is a document URL and needs it (on '/rc/' it would otherwise
 * point outside the app).
 */
export const RowLink = (props: { href: string }): JSX.Element => (
  <a
    class={styles.rowLink}
    href={documentHref(props.href)}
    tabindex={-1}
    aria-hidden="true"
  />
);

/**
 * Whose is a click on a row — the app's or the browser's? `linked` says
 * whether the row has a link; a row without one keeps every click, as before.
 *
 * `true` for any modified click on a linked row, so the row does nothing and
 * the current tab stays where it is. On the link, the browser turns it into a
 * new tab or window. Off it — on a control, or on something that keeps its own
 * pointer events for a `title` (a chip list), where the link can't be reached —
 * the browser has nothing to open, and running `onRowClick` would move the
 * current tab: the one thing a modified click asks not to happen.
 *
 * A plain click is the app's. On the link, the link's own navigation is
 * cancelled (a full page load, or the router's interception — which honours
 * `defaultPrevented`) so the row's `onRowClick` navigates instead, guards and
 * all. Off it, the click is left exactly as it was.
 */
export const leftToBrowser = (event: MouseEvent, linked: boolean): boolean => {
  if (!linked) return false;
  if (!isPlainClick(event)) return true;
  // Duck-typed rather than `instanceof Element`, so it can be tested without
  // a DOM (the isTextEntry approach).
  const target = event.target as Partial<Element> | null;
  if (target?.closest?.(`.${styles.rowLink}`) != null) event.preventDefault();
  return false;
};
