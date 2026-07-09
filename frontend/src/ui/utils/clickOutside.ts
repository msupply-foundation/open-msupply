import { onCleanup } from 'solid-js';

// Dismiss-on-outside-click for dropdown menus. Attach the returned setter as an
// element's `ref`; while that element is mounted, a pointerdown anywhere outside it
// calls `onOutside`. Registered on the document at capture time so it fires before
// the click reaches other handlers, and torn down when the element unmounts (or the
// enclosing Show closes) via onCleanup.
//
//   const dismiss = clickOutside(() => setOpen(false));
//   <div ref={dismiss}> … menu … </div>
//
// Used by every DataTable dropdown (columns panel, table settings) so they all
// close the same way.
export const clickOutside = (onOutside: () => void) => (el: HTMLElement) => {
  const handler = (event: MouseEvent) => {
    if (!el.contains(event.target as Node)) onOutside();
  };
  document.addEventListener('pointerdown', handler, true);
  onCleanup(() => document.removeEventListener('pointerdown', handler, true));
};
