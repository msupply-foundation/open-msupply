/*
 * Bring a DataTable back to its first row — what changing page does (the
 * pager sits at the table's foot, so whoever clicks it has scrolled down, and
 * the new page's rows start at the top).
 *
 * Two scrollers can be involved. A table that owns its scroll box (a
 * fill-the-page list) scrolls that box back to 0. A table some ancestor
 * scrolls (a dialog body, a page that scrolls as a whole on a phone) is
 * brought into view by that ancestor too — but only when its top has gone
 * above the ancestor's top edge: a table already in view stays where it is,
 * so whatever the host shows above it does not jump away.
 */
import { smoothScrollOptions } from '../../utils/createMediaQuery';

const scrollingAncestor = (el: HTMLElement): HTMLElement | undefined => {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight
    )
      return node;
  }
  return undefined;
};

export const scrollTableToTop = (
  root: HTMLElement | undefined,
  scrollBox: HTMLElement | undefined
): void => {
  if (scrollBox) scrollBox.scrollTop = 0;
  if (!root) return;
  const scroller = scrollingAncestor(root);
  const scrollerTop = scroller ? scroller.getBoundingClientRect().top : 0;
  if (root.getBoundingClientRect().top < scrollerTop)
    root.scrollIntoView(smoothScrollOptions({ block: 'start' }));
};
