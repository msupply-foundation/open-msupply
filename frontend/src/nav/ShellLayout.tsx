import type { Component } from 'solid-js';
import { useLocation, useNavigate, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { AppShell } from '../ui/layout/AppShell/AppShell';
import { findLeafByPath, type NavLeaf } from '../ui/layout/AppShell/navModel';
import { authUser, logout } from '../auth/authContext';
import { resolveStorePath } from '../store/StoreGuardLayout';

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
  const NO_SELECTION: NavLeaf = { id: '', labelKey: 'nav.dashboard', to: '' };
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

  return (
    <AppShell
      selected={selected()}
      onNavigate={onNavigate}
      storeName={storeName()}
      onStoreClick={() => navigate(resolveStorePath)}
      username={username()}
      onLogout={() => void logout()}
    >
      {props.children}
    </AppShell>
  );
};
