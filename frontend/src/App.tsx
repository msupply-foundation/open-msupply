import {
  createEffect,
  createSignal,
  For,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from 'solid-js';
import type { Component, JSX } from 'solid-js';
import { Navigate, Route, Router, useParams } from '@solidjs/router';
import { graphqlFetch } from './api/graphql';
import { detectLocale, initialiseLocale, isRtl, locale, t } from './intl';
import { InitialisationStatus } from './api/initialisation.generated';
import { fetchServerInfo } from './api/serverInfo';
import { fetchDisplaySettings } from './api/displaySettings';
import { authUser, checkAuth, startActivityTracking } from './auth/authContext';
import { InitialisationPage } from './initialisation/InitialisationPage';
import { resolveStorePath, StoreGuardLayout } from './store/StoreGuardLayout';
import { navDestinations } from './nav/navConfig';
import { routerBase } from './nav/storeRelativePath';
import { DashboardPage } from './sections/dashboard';
import { stocktakesRoutes } from './sections/stocktakes';
import { stockMovementsRoutes } from './sections/stock-movements';
import {
  customersRoutes,
  suppliersRoutes,
  facilityRegisterRoutes,
} from './sections/names';
import { locationsRoutes } from './sections/locations';
import { customerReturnsRoutes } from './sections/customer-returns';
import { supplierReturnsRoutes } from './sections/supplier-returns';
import { stockRoutes } from './sections/stock';
import { outboundShipmentsRoutes } from './sections/outbound-shipments';
import { inboundShipmentsRoutes } from './sections/inbound-shipments';
import { internalOrdersRoutes } from './sections/internal-orders';
import { requisitionsRoutes } from './sections/requisitions';
import { rnrFormsRoutes } from './sections/rnr-forms';
import { itemsRoutes } from './sections/items';
import { patientsRoutes } from './sections/patients';
import { cliniciansRoutes } from './sections/clinicians';
import { prescriptionsRoutes } from './sections/prescriptions';
import { prescriptionRequestsRoutes } from './sections/prescription-requests';
import { masterListsRoutes } from './sections/master-lists';
import { campaignsRoutes } from './sections/campaigns';
import { reportsRoutes } from './sections/reports';
import { settingsRoutes } from './sections/settings';
import { sitesRoutes } from './sections/sites';
import { helpRoutes, helpDocumentsRoutes } from './sections/help';
import { globalPreferencesRoutes } from './sections/global-preferences';
import { customFieldsRoutes } from './sections/custom-fields';
import { syncMessageRoutes } from './sections/sync-message';
import { ShellLayout } from './nav/ShellLayout';
import { EntryPage } from './nav/EntryPage';
import { LoginPage } from './auth/LoginPage';
import { prefersOldUi } from './preferredFrontend';
import { ReLoginModal } from './auth/ReLoginModal';
import { Alert } from './ui/elements/feedback/Alert';
import { Button } from './ui/elements/buttons/Button';
import { UnexpectedErrorModal } from './UnexpectedErrorModal';
import { StaleBundleModal } from './StaleBundleModal';
import { startStaleBundleWatch } from './staleBundle';
import { startUpdateWatch } from './appUpdate';
import { PluginGate } from './plugins/PluginGate';
import styles from './ui/styles/shared.module.css';

// 'failed' is what the loading phase becomes once a startup pass cannot
// complete (spec, Startup sequence): the loading state claims the app is
// starting, and once it can't, saying so with a way to re-run is the only
// honest thing left. Without it a failed pass sat on a bare "Loading…" for good
// — reachable in practice by dismissing the permission-denied modal, whose OK
// is a dismiss.
type Phase = 'loading' | 'failed' | 'initialisation' | 'operational';

// Nav destinations that have a real, implemented section
// (kdd/explicit-composition: one traceable place to see which sections are
// built). Keyed by their navConfig path; each value is a factory returning the
// section's nested route tree (list + detail etc.), whose view components are
// lazy. Every other destination falls back to EntryPage.
const sectionRoutes: Record<string, () => JSX.Element> = {
  // Home is the store root, so its registry path is '' and its route is the
  // `/` below — it takes no entry here (see the Home route in the tree).
  'inventory/stocktakes': stocktakesRoutes,
  'inventory/stock-movement': stockMovementsRoutes,
  'distribution/customers': customersRoutes,
  'replenishment/suppliers': suppliersRoutes,
  'inventory/locations': locationsRoutes,
  'distribution/customer-return': customerReturnsRoutes,
  'replenishment/supplier-return': supplierReturnsRoutes,
  'inventory/stock': stockRoutes,
  'distribution/outbound-shipment': outboundShipmentsRoutes,
  'distribution/customer-requisition': requisitionsRoutes,
  'replenishment/internal-order': internalOrdersRoutes,
  'replenishment/r-and-r-forms': rnrFormsRoutes,
  'replenishment/inbound-shipment': inboundShipmentsRoutes,
  'catalogue/items': itemsRoutes,
  'catalogue/master-lists': masterListsRoutes,
  'dispensary/patients': patientsRoutes,
  'dispensary/clinicians': cliniciansRoutes,
  'dispensary/prescription': prescriptionsRoutes,
  'dispensary/prescription-request': prescriptionRequestsRoutes,
  reports: reportsRoutes,
  settings: settingsRoutes,
  'manage/sites': sitesRoutes,
  'manage/global-preferences': globalPreferencesRoutes,
  help: helpRoutes,
  'manage/campaigns': campaignsRoutes,
  'manage/help-documents': helpDocumentsRoutes,
  'manage/custom-fields': customFieldsRoutes,
  'manage/sync-message': syncMessageRoutes,
  // The central server's facility register (spec/names S5) — the third list
  // over the name entity, under Manage rather than a store-scoped section.
  'manage/stores': facilityRegisterRoutes,
};

/**
 * The legacy `/{storeId}/dashboard` address, answered with the screen it names.
 * Home moved to the store root (spec/navigation § the registry), so this keeps
 * every bookmark, shared link and printed URL made before the move working —
 * arriving at the canonical URL rather than at the not-found page.
 */
const DashboardRedirect: Component = () => {
  const params = useParams();
  return <Navigate href={`/${params['storeId']}`} />;
};

export const App: Component = () => {
  // Issue #1075: checked before ANY startup work, including the auth check —
  // the two UIs share one session cookie, so a device that switched to old UI
  // is very often still authenticated here too. Gating only the unauthenticated
  // login fallback would never fire in that case: this app would happily render
  // its own authenticated shell (store selection, dashboard, ...) instead of
  // bouncing to the sibling old UI. A Solid component's setup body runs once,
  // so bailing out here before creating any signal is safe — there's no
  // re-render to skip a hook on.
  if (prefersOldUi()) {
    location.replace('/old-ui/');
    return null;
  }

  const [phase, setPhase] = createSignal<Phase>('loading');

  // Spec (Startup Flow): initialisation status → me check → login or routing.
  // The original URL is never navigated away from, so the destination is
  // respected.
  const runStartup = async () => {
    setPhase('loading');
    // Load the detected locale's dictionary before anything renders, so the app
    // never flashes untranslated keys. Failures leave an empty dictionary and
    // t() falls back to keys — startup continues regardless.
    await initialiseLocale(detectLocale());
    // Server role resolves alongside the status check so the phase-visibility
    // matrix (spec/sync-modal) is answerable before either surface renders;
    // re-running startup re-reads it (initialising as central changes it).
    // Site branding rides along for the same reason: the login and
    // initialisation screens are themed, so it must land before they render.
    const [status] = await Promise.all([
      graphqlFetch(InitialisationStatus, {}),
      fetchServerInfo(),
      fetchDisplaySettings(),
    ]);
    // The failure itself is described by the global modal; this pass just can't
    // continue, so it ends on the startup-failed surface offering to re-run.
    if (status.kind !== 'success') {
      setPhase('failed');
      return;
    }
    if (status.data.initialisationStatus.status !== 'INITIALISED') {
      setPhase('initialisation');
      return;
    }
    // checkAuth() is false only when the check neither settled nor came back
    // unauthenticated — a globally handled failure, so the same dead end.
    if (await checkAuth()) setPhase('operational');
    else setPhase('failed');
  };

  onMount(() => {
    void runStartup();
    const stopTracking = startActivityTracking();
    const stopStaleBundleWatch = startStaleBundleWatch();
    // The served-bundle watch runs for the app's whole life, pre-session
    // included — the prompt itself only surfaces in the shell's bottom bar
    // (spec/chrome § update prompt), but a change noticed on the login screen
    // shows the moment the bar exists.
    const stopUpdateWatch = startUpdateWatch();
    onCleanup(() => {
      stopTracking();
      stopStaleBundleWatch();
      stopUpdateWatch();
    });
  });

  // The single owner of document direction/lang, driven by the real i18n locale
  // (RTL for ar/prs/ps). The footer LanguageSelector flips the locale; the
  // shell no longer sets dir itself.
  createEffect(() => {
    document.documentElement.dir = isRtl() ? 'rtl' : 'ltr';
    document.documentElement.lang = locale();
  });

  return (
    <>
      <Switch>
        <Match when={phase() === 'loading'}>
          <div class={styles.page}>
            <p>{t('loading')}</p>
          </div>
        </Match>
        {/* Spec S7: the error's description belongs to the global modal, so this
            surface only states that startup failed and offers to re-run it — in
            place, since there is no entered state to preserve with a reload. */}
        <Match when={phase() === 'failed'}>
          <div class={styles.page}>
            <div class={styles.card}>
              <Alert severity="error" testId="startup-failed">
                {t('error.startup-failed')}
              </Alert>
              <Button
                data-testid="startup-retry"
                onClick={() => void runStartup()}
              >
                {t('button.retry')}
              </Button>
            </div>
          </div>
        </Match>
        <Match when={phase() === 'initialisation'}>
          <InitialisationPage onComplete={() => void runStartup()} />
        </Match>
        <Match when={phase() === 'operational'}>
          <Show when={authUser()} fallback={<LoginPage />}>
            {/* Installed frontend plugins load here (spec/plugins/rules.md §
                lifecycle): a session exists, and nothing operational has
                rendered yet, so a contribution can never pop into an
                already-rendered screen. Store context is deliberately NOT
                waited for — it is a render-time input to each contribution's
                visibility gate. */}
            <PluginGate>
              {/* `routerBase` matches Vite's `base` config so the same build
                can be mounted at a non-root path — the deployed /rc/ track,
                and every branch deploy, which build-and-deploy.sh mounts at
                its own BASE_PATH ('/pr-123/'). It is shared with
                storeRelativePath, which has to take the same prefix back OFF
                the location — the router never does that itself (#1141). */}
              <Router base={routerBase}>
                {/* Store guard wraps the routed app shell; the shell mounts once and
                  pages swap inside it. One route per nav destination renders its
                  (empty) entry page until a real section is registered above. */}
                <Route path="/:storeId" component={StoreGuardLayout}>
                  <Route path="/" component={ShellLayout}>
                    {/* Home: the store root IS the landing screen
                      (spec/dashboard S1, spec/navigation § the registry). One
                      screen, one URL — the nav entry, the brand mark and a
                      bare store link all resolve here. */}
                    <Route path="/" component={DashboardPage} />
                    {/* Bookmarks and links made before Home moved off its own
                      segment. Without this the old address falls through to
                      the not-found catch-all below, which is a worse answer
                      than the screen the user asked for. */}
                    <Route path="/dashboard" component={DashboardRedirect} />
                    <For each={Object.entries(sectionRoutes)}>
                      {([path, routes]) => (
                        <Route path={`/${path}`}>{routes()}</Route>
                      )}
                    </For>
                    <For
                      each={navDestinations.filter(
                        // Home's route is the `/` above, not a generated one:
                        // its path is '' and would generate a second `/`.
                        dest => dest.path !== '' && !sectionRoutes[dest.path]
                      )}
                    >
                      {dest => (
                        <Route
                          path={`/${dest.path}`}
                          component={() => <EntryPage dest={dest} />}
                        />
                      )}
                    </For>
                    {/* Catch-all inside the shell: an unknown in-store path is
                      the not-found page (no destination), which keeps the app
                      bar — and so the menu — reachable. */}
                    <Route path="*" component={() => <EntryPage />} />
                  </Route>
                </Route>
                <Route
                  path="*"
                  component={() => <Navigate href={resolveStorePath} />}
                />
              </Router>
              <ReLoginModal />
            </PluginGate>
          </Show>
        </Match>
      </Switch>
      {/* On top of everything, including other modals. */}
      <UnexpectedErrorModal />
      <StaleBundleModal />
    </>
  );
};
