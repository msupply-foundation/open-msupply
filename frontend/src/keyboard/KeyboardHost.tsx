import { createSignal, onCleanup, onMount } from 'solid-js';
import { useLocation, useNavigate, useParams } from '@solidjs/router';
import { CommandPalette } from './CommandPalette';
import { createGlobalActions } from './globalActions';
import { createNavActions } from './navActions';
import { startKeyboardDispatcher } from './keyboardDispatcher';
import { createAction } from '../ui/utils/keyActions';
import { MOD_K } from '../ui/utils/shortcuts';
import { useFullScreen } from '../ui/layout/AppShell/shellContext';

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
  /** Open the sync window (AC-KB6). */
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

  // Store-relative path, as ShellLayout derives it: '/{store}/inventory/
  // stocktakes/{id}' → 'inventory/stocktakes/{id}'.
  const relativePath = (): string => {
    const prefix = `/${params.storeId}`;
    const rest = location.pathname.startsWith(prefix)
      ? location.pathname.slice(prefix.length)
      : location.pathname;
    return rest.replace(/^\/+|\/+$/g, '');
  };

  const go = (path: string) => navigate(`/${params.storeId}/${path}`);

  /*
   * KB-X5: "navigates up one level — from a detail screen to its list, and so on
   * toward the root."
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
    navigate: go,
    openSync: props.onSyncOpen,
    requestLogout: props.onLogoutRequest,
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

  return (
    <CommandPalette
      open={paletteOpen()}
      onClose={() => setPaletteOpen(false)}
    />
  );
};
