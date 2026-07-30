import { createSignal } from 'solid-js';
import { createMediaQuery } from '../../utils/createMediaQuery';
import { mediaQuery } from '../../styles/breakpoints';
import { createAction } from '../../utils/keyActions';
import { ALT_M, ALT_SHIFT_M } from '../../utils/shortcuts';

const KEY = 'side-panel-open';

/*
 * Page-level side-panel open state (spec ui-standards/layout.md → page
 * regions): open by default on very wide viewports, closed otherwise; a
 * user's explicit open/close choice wins over the responsive default and
 * persists across reloads. One shared key, not per-user — the state is
 * cosmetic, mirroring the current app's global /detailpanel/open. The page
 * still owns the affordances (the panel's close button, the app bar's More
 * reopen button) — this owns only the boolean.
 *
 * IT ALSO REGISTERS Alt+M / Alt+Shift+M (spec/keyboard KB-R2, AC-KB4a), and that
 * placement is the whole point. KB-R2 says a generic binding is "gated on the
 * thing it acts on being present, AND ON NOTHING ELSE... A screen offering it and
 * not answering the key is a defect in that screen, not a narrower binding."
 *
 * Every screen with a more-info panel already calls this helper, and it owns the
 * boolean the binding toggles — so "the screen has a more-info panel" IS "this
 * helper was called". A screen cannot acquire a panel without acquiring the
 * bindings, and nobody can gate them on the store's mode or the vertical,
 * because neither is in scope here. That is a structural guarantee where a
 * per-screen `createAction` call would have been a convention to remember.
 */
export const createSidePanelOpen = (): [
  () => boolean,
  (open: boolean) => void,
] => {
  let stored: boolean | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === 'true' || raw === 'false') stored = raw === 'true';
  } catch {
    // Storage unavailable (private mode) — fall through to the responsive
    // default.
  }

  const wide = createMediaQuery(mediaQuery.sidePanelWide);
  const [choice, setChoice] = createSignal<boolean | null>(stored);

  const open = () => choice() ?? wide();
  const setOpen = (next: boolean) => {
    setChoice(next);
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      // Best effort — the in-session signal still works.
    }
  };

  // Show / hide the panel. Two actions rather than one toggle, because the spec
  // gives them separate bindings and separate palette names ("More info panel:
  // show" / "…: hide") — a user reaching for Alt+M wants it OPEN, not flipped.
  // Each is disabled in the state where it would do nothing, so the palette
  // offers only the one that applies.
  createAction({
    name: 'cmdk.more-info-open',
    shortcut: ALT_M,
    run: () => setOpen(true),
    disabled: open,
  });
  createAction({
    name: 'cmdk.more-info-close',
    shortcut: ALT_SHIFT_M,
    run: () => setOpen(false),
    disabled: () => !open(),
  });

  return [open, setOpen];
};
