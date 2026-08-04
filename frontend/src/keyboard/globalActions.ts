import { createAction } from '../ui/utils/keyActions';
import { ALT_H, ALT_SHIFT_L, ALT_SHIFT_S, ESCAPE } from '../ui/utils/shortcuts';

/*
 * The actions available on every screen (spec/keyboard KB-R1, ui-surface S1 §
 * Commands) plus the Escape ladder's tail.
 *
 * Created by KeyboardHost inside ShellLayout, which is where the router, the
 * store context and the sync modal all already live — so each `run` is a direct
 * call into the thing that owns the behaviour, not a lookup.
 */

export interface GlobalActionHandlers {
  /** Go to a store-relative path. */
  navigate: (path: string) => void;
  /** Open the sync window (AC-KB6 — the screen underneath must not navigate). */
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
  // NOTE: Alt+D / "Go to: Dashboard" is NOT here — Dashboard is a destination,
  // so navActions owns it (with the shortcut attached). Registering it in both
  // places put two Dashboard rows in the palette, one with the binding and one
  // without.
  createAction({
    name: 'help',
    shortcut: ALT_H,
    run: () => handlers.navigate('help'),
  });
  createAction({
    name: 'sync',
    shortcut: ALT_SHIFT_S,
    run: handlers.openSync,
  });
  createAction({
    name: 'logout',
    shortcut: ALT_SHIFT_L,
    run: handlers.requestLogout,
  });
  // Name-only commands (S1 § Commands): no shortcut, reachable by browsing.
  createAction({
    name: 'settings',
    run: () => handlers.navigate('settings'),
  });

  /*
   * NOT registered here, deliberately:
   *
   *  - EASTER EGG (Alt+Shift+E, ALT_SHIFT_E, `easter-egg`). The binding and the
   *    locale key both exist, but the app has no easter egg to run. Registering
   *    it against a no-op would put a palette row in front of the user that does
   *    nothing, which is worse than its absence. Left unregistered until the
   *    feature lands; ALT_SHIFT_E is already in the binding table waiting for it.
   *  - NAVIGATION SHOW/HIDE (`cmdk.drawer-toggle`). AppShell owns the rail's
   *    collapsed state, so AppShell registers it — the same structural rule as
   *    createSidePanelOpen owning Alt+M (KB-R2): the action is created where the
   *    thing it acts on lives, not threaded out to a caller.
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
      if (handlers.exitFullScreen()) return;
      handlers.navigateUp();
    },
  });
};
