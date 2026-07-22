import { createSignal } from 'solid-js';
import { createMediaQuery } from '../../utils/createMediaQuery';
import { mediaQuery } from '../../styles/breakpoints';

const KEY = 'side-panel-open';

/*
 * Page-level side-panel open state (spec ui-standards/layout.md → page
 * regions): open by default on very wide viewports, closed otherwise; a
 * user's explicit open/close choice wins over the responsive default and
 * persists across reloads. One shared key, not per-user — the state is
 * cosmetic, mirroring the current app's global /detailpanel/open. The page
 * still owns the affordances (the panel's close button, the app bar's More
 * reopen button) — this owns only the boolean.
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

  return [open, setOpen];
};
