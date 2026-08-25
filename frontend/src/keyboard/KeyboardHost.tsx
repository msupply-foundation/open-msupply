import { createSignal, onCleanup, onMount, Suspense } from 'solid-js';
import { useLocation, useNavigate, useParams } from '@solidjs/router';
import { CommandPalette } from './CommandPalette';
import { createGlobalActions } from './globalActions';
import { createNavActions } from './navActions';
import { startKeyboardDispatcher } from './keyboardDispatcher';
import { createAction } from '../ui/utils/keyActions';
import { MOD_K } from '../ui/utils/shortcuts';
import { useFullScreen } from '../ui/layout/AppShell/shellContext';
import { storeRelativePath } from '../nav/storeRelativePath';

/*
 * Where the keyboard layer is switched on (spec/keyboard). Mounted inside
 * AppShell, under ShellLayout, so it sits:
 *
 *   - inside <Router>, for navigate / navigate-up;
 *   - inside AppShell, so useFullScreen() reaches the shell's flag (KB-X4);
 *   - under StoreGuardLayout, so the destination gates read a settled store
 *     context (AC-KB4);
 *   - and NOT on the login or boot screens, where navigate-up and the registry
 *     mean nothing.
 *
 * It renders only the palette. Everything else it does is register actions,
 * whose lifetime is this component's — so leaving the store tears the whole set
 * down without a single explicit unregister.
 */

export interface KeyboardHostProps {
  /** Start a manual sync (AC-KB6) — what the Alt+Shift+S binding now does. */
  onSyncNow: () => void;
  /** Open the sync window (AC-KB6) — the palette's `Sync details` row. */
  onSyncOpen: () => void;
  /** Ask to confirm, then log out (AC-KB5). */
  onLogoutRequest: () => void;
}

export const KeyboardHost = (props: KeyboardHostProps) => {
  const params = useParams<{ storeId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const fullScreen = useFullScreen();

  const [paletteOpen, setPaletteOpen] = createSignal(false);

  // Store-relative path, from the same derivation ShellLayout uses:
  // '/{store}/inventory/stocktakes/{id}' → 'inventory/stocktakes/{id}'.
  const relativePath = (): string =>
    storeRelativePath(location.pathname, params.storeId);

  const go = (path: string) => navigate(`/${params.storeId}/${path}`);

  /*
   * KB-X5: "navigates up one level — from a detail screen to its list, and so
   * on toward the root."
   *
   * One segment off the path, which IS the hierarchy the routes already encode:
   * a detail's id drops to its list, a list drops to its section's entry page,
   * and the last segment drops to the store root (which is the dashboard).
   * Deriving it from the URL rather than keeping a stack means it stays correct
   * however the user arrived — deep link, back button, or a palette jump.
   */
  const navigateUp = () => {
    const segments = relativePath().split('/').filter(Boolean);
    if (segments.length <= 1) {
      // Already at a top-level destination (or the root): the root is home.
      go('');
      return;
    }
    go(segments.slice(0, -1).join('/'));
  };

  createGlobalActions({
    // Called through props rather than captured: an action's `run` outlives
    // this component body, so reading the handler at registration time would
    // freeze whichever function the shell passed on first render.
    syncNow: () => props.onSyncNow(),
    openSync: () => props.onSyncOpen(),
    requestLogout: () => props.onLogoutRequest(),
    // KB-X4: exit full screen if engaged, and report it so the tail stops there
    // rather than also navigating.
    exitFullScreen: () => {
      if (fullScreen?.isFullScreen() !== true) return false;
      fullScreen.setFullScreen(false);
      return true;
    },
    navigateUp,
  });

  createNavActions(go);

  /*
   * The palette's own opener (KB-P1). `surface` tier, so Cmd/Ctrl+K works from
   * inside a text field too — "from any screen, over whatever is on it".
   * Unlisted: a palette row for "open the palette" would be noise.
   */
  createAction({
    unlisted: true,
    shortcut: MOD_K,
    run: () => setPaletteOpen(true),
  });

  // The one app-level key listener, for as long as the shell lives.
  onMount(() => {
    const stop = startKeyboardDispatcher();
    onCleanup(stop);
  });

  /*
   * The KB-R2 defect checked from the control's end: a carrier advertising a
   * binding no action owns (see devCarrierAudit). Dev only, and reached
   * through a DYNAMIC import inside this branch so the module never enters the
   * production chunk graph — a static import from a component would, and the
   * per-carrier version of this check cost +632 B gzip in prod for exactly
   * that reason.
   */
  if (import.meta.env.DEV) {
    onMount(() => {
      let stop: (() => void) | undefined;
      let cancelled = false;
      void import('./devCarrierAudit').then(({ startCarrierAudit }) => {
        if (!cancelled) stop = startCarrierAudit();
      });
      onCleanup(() => {
        cancelled = true;
        stop?.();
      });
    });
  }

  /*
   * The palette evaluates every registered action's `disabled()` when it
   * opens, and those predicates are app code: one that reads a resource's
   * `.latest` while that resource is still pending SUSPENDS the computation
   * doing the reading. Without a boundary here that computation's nearest
   * <Suspense> is the shell's, so one careless `disabled` on one screen would
   * blank the whole app behind the palette.
   *
   * An action's `disabled` must still gate on `.state` rather than read a
   * suspending source (kdd/keyboard-layer, kdd/solid-reactivity-pitfalls) —
   * this boundary is what makes forgetting cost an empty palette for a frame
   * instead of the screen the user was working on.
   */
  return (
    <Suspense>
      <CommandPalette
        open={paletteOpen()}
        onClose={() => setPaletteOpen(false)}
      />
    </Suspense>
  );
};
