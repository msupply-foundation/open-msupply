import type { Component } from 'solid-js';
import { useLocation, useNavigate, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { AppShell } from '../ui/layout/AppShell/AppShell';
import { findLeafByPath, type NavLeaf } from '../ui/layout/AppShell/navModel';

// The routed app shell: one <AppShell> for the whole in-store app, with the page
// swapping inside it (props.children — the matched section route). This is the
// "router stand-in" role the shell's own doc calls out, now filled by a real
// root layout route: `selected` is derived from the URL, `onNavigate` pushes a
// route. Mounted once under StoreGuardLayout, so menu state survives navigation.
export const ShellLayout: Component<RouteSectionProps> = (props) => {
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

  const NO_SELECTION: NavLeaf = { id: '', label: '', to: '' };
  const selected = (): NavLeaf =>
    findLeafByPath(relativePath() || 'dashboard') ?? NO_SELECTION;

  const onNavigate = (leaf: NavLeaf) => navigate(`/${params.storeId}/${leaf.to}`);

  return (
    <AppShell selected={selected()} onNavigate={onNavigate}>
      {props.children}
    </AppShell>
  );
};
