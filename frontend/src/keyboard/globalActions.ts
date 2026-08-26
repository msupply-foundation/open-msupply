import { createAction } from '../ui/utils/keyActions';
import { ALT_SHIFT_L, ALT_SHIFT_S, ESCAPE } from '../ui/utils/shortcuts';

/*
 * The actions available on every screen (spec/keyboard KB-R1, ui-surface S1 §
 * Commands) plus the Escape ladder's tail.
 *
 * Created by KeyboardHost inside ShellLayout, which is where the router, the
 * store context and the sync modal all already live — so each `run` is a direct
 * call into the thing that owns the behaviour, not a lookup.
 */

export interface GlobalActionHandlers {
  /** Start a manual sync, without opening anything (AC-KB6). */
  syncNow: () => void;
  /** Open the sync window (AC-KB6 — the screen underneath must not move). */
  openSync: () => void;
  /** Log out, asking to confirm first (AC-KB5). */
  requestLogout: () => void;
  /**
   * Exit full-screen mode if engaged, reporting whether it did (KB-X4). The
   * Escape tail consults this FIRST: "while full screen is engaged, Escape MUST
   * NOT also navigate".
   */
  exitFullScreen: () => boolean;
  /** Navigate up one level, towards the root (KB-X5). */
  navigateUp: () => void;
}

export const createGlobalActions = (handlers: GlobalActionHandlers): void => {
  /*
   * NOT here, though the binding table lists them: DASHBOARD (`Alt+D`), HELP
   * (`Alt+H`) and SETTINGS. All three are destinations in the navigation
   * registry, so navActions registers them with the rest of the menu and
   * carries their shortcuts (D107). Registering a destination in both places
   * put two rows in the palette, one with the binding and one without.
   *
   * What is left here is what the menu cannot reach: an action on the app
   * rather than a place in it.
   */
  /*
   * The shortcut SYNCS; it no longer opens the modal (issue #9229). A binding
   * whose whole job was to raise a dialog the user then had to click through
   * was a keystroke that saved nothing — and the bottom bar now shows the run's
   * progress, so there is nothing the modal had to be open to tell them.
   *
   * Two rows, because they are two different acts: `sync` runs one, and
   * `sync-details` opens the window for someone who wants the phase-by-phase
   * detail. Only the first carries a binding — the detail view is a browse, not
   * a reflex.
   */
  createAction({
    name: 'sync',
    shortcut: ALT_SHIFT_S,
    run: handlers.syncNow,
  });
  createAction({
    name: 'button.sync-details',
    run: handlers.openSync,
  });
  createAction({
    name: 'logout',
    shortcut: ALT_SHIFT_L,
    run: handlers.requestLogout,
  });

  /*
   * NOT registered here, deliberately:
   *
   *  - EASTER EGG (Alt+Shift+E, ALT_SHIFT_E, `easter-egg`). The binding and
   *    the locale key both exist, but the app has no easter egg to run.
   *    Registering it against a no-op would put a palette row in front of the
   *    user that does nothing, which is worse than its absence. Left
   *    unregistered until the feature lands; ALT_SHIFT_E is already in the
   *    binding table waiting for it.
   *  - NAVIGATION SHOW/HIDE (`cmdk.drawer-toggle`). AppShell owns the rail's
   *    collapsed state, so AppShell registers it — the same structural rule
   *    as createSidePanelOpen owning Alt+M (KB-R2): the action is created
   *    where the thing it acts on lives, not threaded out to a caller.
   */

  /*
   * The Escape ladder's TAIL — its two bottom rungs, in one explicitly ordered
   * function (kdd/keyboard-layer decision 5).
   *
   * Every rung above this one is a SURFACE, and each consumes Escape itself:
   * the palette and any open dialog through the native <dialog> close watcher,
   * the slide-over and a table's row focus through their own element handlers.
   * Containment orders those, because "the innermost open surface claims it" is
   * a statement about nesting.
   *
   * These two are not surfaces — they are app state — so containment cannot
   * order them, and the order has to be written down. Full screen first, then
   * navigate up.
   *
   * UNLISTED (AC-KB11): the entry exists to own the binding, and a palette row
   * reading "navigate up one level" would be noise. Its tier is `global`, so it
   * is suppressed while a text field holds focus (KB-X5) — unlike a dialog's
   * Escape, which is not.
   */
  createAction({
    unlisted: true,
    shortcut: ESCAPE,
    run: () => {
      // An open native popover (popover="auto" — table settings, a filter
      // panel) is the innermost open surface, but unlike a <dialog> it brings
      // no element handler that would stop the key reaching this action — and
      // the dispatcher has already preventDefault()ed by the time run() is
      // called, which CANCELS the platform's own Escape close-request. So this
      // rung both claims the press and performs it: close the popover (the
      // last-opened one; hiding it also hides any above it in the auto stack)
      // and stop the ladder.
      const popovers = document.querySelectorAll<HTMLElement>(':popover-open');
      const topmost = popovers[popovers.length - 1];
      if (topmost) {
        topmost.hidePopover();
        return;
      }
      if (handlers.exitFullScreen()) return;
      handlers.navigateUp();
    },
  });
};
