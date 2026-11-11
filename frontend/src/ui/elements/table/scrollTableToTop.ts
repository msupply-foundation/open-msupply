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
 * so whatever the host shows above it does not jump away. With no scrolling
 * ancestor the edge is the viewport's top, and the window scrolls.
 *
 * Only that one scroller moves. `scrollIntoView` would move every scroll
 * container above the table, `overflow: hidden` ones included, which the Page
 * frame's regions must never do (Page.module.css).
 */
import { prefersReducedMotion } from '../../utils/createMediaQuery';

const scrollingAncestor = (el: HTMLElement): HTMLElement | undefined => {
  for (let node = el.parentElement; node; node = node.parentElement) {
    // A dialog is its own world: what scrolls behind the modal is not this
    // table's scroller, so the search stops at its edge.
    if (node instanceof HTMLDialogElement) return undefined;
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
  const inDialog = root.closest('dialog') !== null;
  // Inside a dialog with nothing scrolling, nothing moves: the window is
  // behind the modal.
  if (!scroller && inDialog) return;
  const edge = scroller ? scroller.getBoundingClientRect().top : 0;
  const by = root.getBoundingClientRect().top - edge;
  if (by >= 0) return;
  const options: ScrollToOptions = {
    top: by,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  };
  if (scroller) scroller.scrollBy(options);
  else window.scrollBy(options);
};
