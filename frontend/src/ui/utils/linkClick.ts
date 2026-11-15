/*
 * Whose click is it — the app's, or the browser's? (#271)
 *
 * A destination rendered as a real `<a href>` (a menu entry, a list row) gets
 * the browser's whole link contract for free: right-click → "Open link in new
 * tab", "Copy link address", Cmd/Ctrl-click, Shift-click, middle-click. The
 * app still owns the ordinary click — it runs side effects the browser knows
 * nothing about (closing the mobile menu, the row's own handler) — so a link's
 * click handler takes a PLAIN click and leaves every other one alone.
 *
 * The same test the router applies before it intercepts an anchor click
 * (@solidjs/router handleAnchor), so the two never disagree about which
 * clicks stay in the tab. Middle-click never arrives here: it fires
 * `auxclick`, not `click`, and the browser opens the tab on its own.
 */
export const isPlainClick = (event: MouseEvent): boolean =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

/**
 * The click handler of a control that is a link when it has an `href` and a
 * button when it hasn't (the menu's entries: the app gives them URLs, the
 * showcase doesn't). With an href, a modified click is the browser's and
 * `action` doesn't run — the current tab stays exactly as it was. A plain click
 * cancels the link's own navigation (the router's interception honours
 * `defaultPrevented`) and runs `action`, which navigates in-app. Without an
 * href every click runs `action`, as a button's always has.
 */
export const onLinkClick = (
  event: MouseEvent,
  href: string | undefined,
  action: () => void
): void => {
  if (href) {
    if (!isPlainClick(event)) return;
    event.preventDefault();
  }
  action();
};
