import {
  createEffect,
  createMemo,
  createSignal,
  lazy,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import type { Component } from 'solid-js';
import { Navigate, useLocation, useNavigate, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { AppShell } from '../ui/layout/AppShell/AppShell';
import { ConfirmDialog } from '../ui/elements/feedback/ConfirmDialog';
import { t } from '../intl';
import {
  findLeafByPath,
  lowerNav,
  sectionIconForPath,
  upperNav,
  type NavLeaf,
} from '../ui/layout/AppShell/navModel';
import { ShellSectionContext } from '../ui/layout/AppShell/shellContext';
import { authUser, logout, userDisplayName } from '../auth/authContext';
import { isCentralServer } from '../api/serverInfo';
import { reportPermissionDenied } from '../api/graphql';
import { createMediaQuery } from '../ui/utils/createMediaQuery';
import { mediaQuery } from '../ui/styles/breakpoints';
import { deniedPermission, gateNav, mobileNav, routeAccess } from './navGates';
import { KeyboardHost } from '../keyboard/KeyboardHost';
import { startSyncWatch, stopSyncWatch } from '../api/syncStore';
import { createSyncIndicator } from '../sections/sync-modal/syncIndicator';
import { StoreSwitchModal } from '../store/StoreSwitchModal';
import { reloadForUpdate, updateAvailable } from '../appUpdate';

// The sync modal is the sync-modal vertical's chunk — loaded on first open,
// not with the shell (each vertical is its own lazy chunk).
const SyncModal = lazy(() =>
  import('../sections/sync-modal/SyncModal').then(m => ({
    default: m.SyncModal,
  }))
);

// The store editor is the settings vertical's chunk (spec/settings § S5) —
// loaded on first open from the footer's Edit cell, not with the shell.
const StoreEditorModal = lazy(() =>
  import('../sections/settings/store-editor/StoreEditorModal').then(m => ({
    default: m.StoreEditorModal,
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

  // The nav group's glyph for wherever we are — handed to every page's
  // breadcrumb through the shell-section context, since the group a screen sits
  // under is the route's business, not the page's (spec/ui-standards › layout,
  // page regions; shellContext › ShellSection). Record screens inherit their
  // list's section, the store root is the dashboard, and an off-registry path
  // (the not-found catch-all) simply has none.
  const sectionIcon = () => sectionIconForPath(relativePath() || 'dashboard');

  // A permission-gated destination stays in the menu, but activating it
  // refuses instead of navigating: the permission-denied dialog opens, naming
  // the missing permission, and the user stays where they were
  // (spec/navigation § permission gates, D94; OMS-REG-NAV-01.19).
  const onNavigate = (leaf: NavLeaf) => {
    const denied = deniedPermission(leaf);
    if (denied !== undefined) {
      reportPermissionDenied([denied]);
      return;
    }
    navigate(`/${params.storeId}/${leaf.to}`);
  };

  // Nav visibility gates live in src/nav/navGates.ts, shared with the command
  // palette so the menu and the palette can never disagree about where the user
  // can go (spec/keyboard AC-KB4). At phone width the menu narrows further to
  // the registry's mobile-friendly subset (spec/navigation § mobile-friendly,
  // D95; OMS-REG-NAV-01.21) — presentation only, routes stay untouched.
  // Memoised so the gated arrays — and the section objects rebuilt when a
  // child is dropped — keep stable references; otherwise MenuBar's <For> would
  // remount nav sections on every shell re-render
  // (kdd/solid-reactivity-pitfalls).
  const isPhone = createMediaQuery(mediaQuery.compact);
  const menuUpper = createMemo(() =>
    isPhone() ? mobileNav(gateNav(upperNav)) : gateNav(upperNav)
  );
  const menuLower = createMemo(() =>
    isPhone() ? mobileNav(gateNav(lowerNav)) : gateNav(lowerNav)
  );

  // The router is the registry's third surface (spec/navigation § one
  // registry): a capability-gated destination's URL is unreachable — it lands
  // on the dashboard (D70 generalised; OMS-REG-NAV-01.16) — and a
  // permission-gated one lands there WITH the permission-denied dialog
  // (OMS-REG-NAV-01.20). Sections with their own layout guards (patients,
  // prescriptions, clinicians) keep them; this covers every destination
  // uniformly, placeholder pages included. Renders under StoreGuardLayout, so
  // the gates read a settled store context (no flash of a blocked screen).
  const access = createMemo(() => routeAccess(relativePath() || 'dashboard'));
  createEffect(() => {
    const verdict = access();
    if (verdict.kind === 'forbidden')
      reportPermissionDenied([verdict.permission]);
  });

  // The active store + signed-in user shown in the bottom bar. The store list
  // and user come from the me/login response (authContext); the active store is
  // the one named by the URL. Activating the store selector opens the
  // store-switch modal over the current screen (spec SL-6 / D14 /
  // OMS-REG-LGN-02.11); the user menu logs out (spec: explicit logout).
  const activeStore = () =>
    authUser()?.stores.nodes.find(s => s.id === params.storeId);
  const storeName = () => activeStore()?.name ?? '';
  const username = () => authUser()?.username ?? '';

  // Mounted fresh per open (the <Show> below), so the panel's search and
  // checkbox state reset between opens; closing (dismiss or a confirmed
  // switch) unmounts it, and the native <dialog> returns focus to the trigger
  // (OMS-REG-LGN-02.29/.30).
  const [storeSwitchOpen, setStoreSwitchOpen] = createSignal(false);

  // Spec OMS-REG-FTR-01.9/.10: Logout is gated by a confirmation modal, and
  // confirming ends the session — clearing the user swaps the whole shell for
  // the login screen (App's <Show when={authUser()}>). The URL is then reset
  // to the root (spec § explicit logout, OMS-REG-LGN-01.28) so the next
  // sign-in resolves the store from scratch instead of silently re-entering
  // the one the logged-out screen's URL still named. AFTER the user clears —
  // navigating first would route a still-authenticated app through the
  // /resolve-store guard and flash the picker for the server round-trip.
  const [logoutConfirmOpen, setLogoutConfirmOpen] = createSignal(false);
  const logoutAndReset = () => void logout().then(() => navigate('/'));

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

  // The store editor (spec/settings § S5, OMS-REG-SET-05.17/.18): the footer's
  // Edit cell opens it on its Properties tab, on every screen and for every
  // signed-in user — no permission gates OPENING it; permissions govern what is
  // editable inside. Mounted only once opened, like the sync modal above, so
  // its chunk (and its two queries) cost nothing until asked for.
  const [storeEditOpen, setStoreEditOpen] = createSignal(false);
  const [storeEditEverOpened, setStoreEditEverOpened] = createSignal(false);
  const openStoreEdit = () => {
    setStoreEditEverOpened(true);
    setStoreEditOpen(true);
  };

  // Update prompt (spec/chrome § update prompt, OMS-REG-FTR-02.15/.16): the
  // footer cell only OFFERS the reload — reloading discards anything the user
  // is part-way through, so a confirm gates it. Cancel leaves the session
  // untouched and the cell stays; the app never reloads on its own.
  const [updateConfirmOpen, setUpdateConfirmOpen] = createSignal(false);

  return (
    <>
      <AppShell
        upper={menuUpper()}
        lower={menuLower()}
        selected={selected()}
        onNavigate={onNavigate}
        onSyncOpen={openSync}
        /* The brand mark goes home — the store root, which IS the dashboard
           (see relativePath above, where an empty path resolves to it). The
           conventional job for a logo in app chrome, and the reason it is not
           wired to the rail toggle instead. */
        onHome={() => navigate(`/${params.storeId}`)}
        syncBadge={syncIndicator.badge()}
        syncIconDimmed={syncIndicator.dimmed()}
        storeName={storeName()}
        onStoreClick={() => setStoreSwitchOpen(true)}
        onStoreEdit={openStoreEdit}
        username={username()}
        displayName={userDisplayName()}
        email={authUser()?.email}
        jobTitle={authUser()?.jobTitle}
        onLogout={() => setLogoutConfirmOpen(true)}
        isCentralServer={isCentralServer()}
        updateAvailable={updateAvailable()}
        onUpdateClick={() => setUpdateConfirmOpen(true)}
      >
        <KeyboardHost
          onSyncOpen={openSync}
          onLogoutRequest={() => setLogoutConfirmOpen(true)}
        />
        <Show
          when={access().kind === 'ok'}
          fallback={<Navigate href={`/${params.storeId}`} />}
        >
          {/* Wraps the PAGE, not the shell chrome: the only consumer is the
              page header's breadcrumb. */}
          <ShellSectionContext.Provider value={{ icon: sectionIcon }}>
            {props.children}
          </ShellSectionContext.Provider>
        </Show>
      </AppShell>
      <Show when={syncEverOpened()}>
        <SyncModal open={syncOpen()} onClose={() => setSyncOpen(false)} />
      </Show>
      <Show when={storeSwitchOpen()}>
        <StoreSwitchModal open onClose={() => setStoreSwitchOpen(false)} />
      </Show>
      <ConfirmDialog
        open={logoutConfirmOpen()}
        onClose={() => setLogoutConfirmOpen(false)}
        title={t('heading.logout-confirm')}
        message={t('messages.logout-confirm')}
        onConfirm={logoutAndReset}
      />
      <ConfirmDialog
        open={updateConfirmOpen()}
        onClose={() => setUpdateConfirmOpen(false)}
        title={t('label.new-version-available')}
        message={t('messages.new-version-reload-confirm')}
        confirmLabel={t('button.refresh')}
        onConfirm={reloadForUpdate}
      />
      <Show when={storeEditEverOpened()}>
        <StoreEditorModal
          open={storeEditOpen()}
          storeId={params.storeId}
          // The store's FACILITY record — the row the editor reads and writes.
          // Rides the me/login response's store list (UserStoreNode.nameId).
          nameId={activeStore()?.nameId ?? ''}
          onClose={() => setStoreEditOpen(false)}
        />
      </Show>
    </>
  );
};
