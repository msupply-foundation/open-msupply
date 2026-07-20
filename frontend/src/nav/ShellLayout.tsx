import { createSignal, lazy, onCleanup, onMount, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useLocation, useNavigate, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { AppShell } from '../ui/layout/AppShell/AppShell';
import { findLeafByPath, type NavLeaf } from '../ui/layout/AppShell/navModel';
import { authUser, logout } from '../auth/authContext';
import { isCentralServer } from '../api/serverInfo';
import { startSyncWatch, stopSyncWatch } from '../api/syncStore';
import { createSyncIndicator } from '../sections/sync-modal/syncIndicator';
import { resolveStorePath } from '../store/StoreGuardLayout';

// The sync modal is the sync-modal vertical's chunk — loaded on first open,
// not with the shell (each vertical is its own lazy chunk).
const SyncModal = lazy(() =>
  import('../sections/sync-modal/SyncModal').then(m => ({
    default: m.SyncModal,
  }))
);

// The routed app shell: one <AppShell> for the whole in-store app, with the
// page swapping inside it (props.children — the matched section route). This is
// the "router stand-in" role the shell's own doc calls out, now filled by a
// real root layout route: `selected` is derived from the URL, `onNavigate`
// pushes a route. Mounted once under StoreGuardLayout, so menu state survives
// navigation.
export const ShellLayout: Component<RouteSectionProps> = props => {
  const params = useParams<{ storeId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // The path relative to the store root, e.g. '/{store}/inventory/stocktakes'
  // → 'inventory/stocktakes'. The empty (store root) path is the dashboard.
  const relativePath = () => {
    const prefix = `/${params.storeId}`;
    const rest = location.pathname.startsWith(prefix)
      ? location.pathname.slice(prefix.length)
      : location.pathname;
    return rest.replace(/^\/+|\/+$/g, '');
  };

  // Sentinel for "no menu item matches this route": only `id` is consumed (the
  // menu highlights by id, and '' matches nothing). labelKey is never rendered
  // for it, so any valid key satisfies the type.
  const NO_SELECTION: NavLeaf = { id: '', labelKey: 'dashboard', to: '' };
  const selected = (): NavLeaf =>
    findLeafByPath(relativePath() || 'dashboard') ?? NO_SELECTION;

  const onNavigate = (leaf: NavLeaf) =>
    navigate(`/${params.storeId}/${leaf.to}`);

  // The active store + signed-in user shown in the bottom bar. The store list
  // and user come from the me/login response (authContext); the active store is
  // the one named by the URL. Activating the store selector routes to the
  // store-selection screen (spec SL-6 / AC-SL8); the user menu logs out (spec:
  // explicit logout).
  const activeStore = () =>
    authUser()?.stores.nodes.find(s => s.id === params.storeId);
  const storeName = () => activeStore()?.name ?? '';
  const username = () => authUser()?.username ?? '';

  // Spec (sync-modal; chrome › sync indicator): the chrome's sync affordance
  // opens the modal; the shared sync watch (substrate) runs for the whole
  // signed-in session — it also drives the post-sync refresh (spec/sync-modal
  // § After a run completes). Badge/dim derivation is the sync-modal
  // vertical's, consumed through its host module (the generated seam).
  const [syncOpen, setSyncOpen] = createSignal(false);
  const [syncEverOpened, setSyncEverOpened] = createSignal(false);
  onMount(startSyncWatch);
  onCleanup(stopSyncWatch);
  const syncIndicator = createSyncIndicator();
  const openSync = () => {
    setSyncEverOpened(true);
    setSyncOpen(true);
  };

  return (
    <>
      <AppShell
        selected={selected()}
        onNavigate={onNavigate}
        onSyncOpen={openSync}
        syncBadge={syncIndicator.badge()}
        syncIconDimmed={syncIndicator.dimmed()}
        storeName={storeName()}
        onStoreClick={() => navigate(resolveStorePath)}
        username={username()}
        onLogout={() => void logout()}
        isCentralServer={isCentralServer()}
      >
        {props.children}
      </AppShell>
      <Show when={syncEverOpened()}>
        <SyncModal open={syncOpen()} onClose={() => setSyncOpen(false)} />
      </Show>
    </>
  );
};
