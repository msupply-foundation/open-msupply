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
import { Navigate, Route, Router } from '@solidjs/router';
import { graphqlFetch } from './api/graphql';
import { detectLocale, initialiseLocale, isRtl, locale, t } from './intl';
import { InitialisationStatus } from './api/initialisation.generated';
import { fetchServerInfo } from './api/serverInfo';
import { authUser, checkAuth, startActivityTracking } from './auth/authContext';
import { InitialisationPage } from './initialisation/InitialisationPage';
import { resolveStorePath, StoreGuardLayout } from './store/StoreGuardLayout';
import { navDestinations } from './nav/navConfig';
import { DashboardPage, dashboardRoutes } from './sections/dashboard';
import { stocktakesRoutes } from './sections/stocktakes';
import { customersRoutes, suppliersRoutes } from './sections/names';
import { locationsRoutes } from './sections/locations';
import { customerReturnsRoutes } from './sections/customer-returns';
import { stockRoutes } from './sections/stock';
import { outboundShipmentsRoutes } from './sections/outbound-shipments';
import { inboundShipmentsRoutes } from './sections/inbound-shipments';
import { itemsRoutes } from './sections/items';
import { patientsRoutes } from './sections/patients';
import { cliniciansRoutes } from './sections/clinicians';
import { prescriptionsRoutes } from './sections/prescriptions';
import { masterListsRoutes } from './sections/master-lists';
import { reportsRoutes } from './sections/reports';
import { settingsRoutes } from './sections/settings';
import { helpRoutes } from './sections/help';
import { ShellLayout } from './nav/ShellLayout';
import { EntryPage } from './nav/EntryPage';
import { LoginPage } from './auth/LoginPage';
import { ReLoginModal } from './auth/ReLoginModal';
import { UnexpectedErrorModal } from './UnexpectedErrorModal';
import styles from './ui/styles/shared.module.css';

type Phase = 'loading' | 'initialisation' | 'operational';

// Nav destinations that have a real, implemented section
// (kdd/explicit-composition: one traceable place to see which sections are
// built). Keyed by their navConfig path; each value is a factory returning the
// section's nested route tree (list + detail etc.), whose view components are
// lazy. Every other destination falls back to EntryPage.
const sectionRoutes: Record<string, () => JSX.Element> = {
  dashboard: dashboardRoutes,
  'inventory/stocktakes': stocktakesRoutes,
  'distribution/customers': customersRoutes,
  'replenishment/suppliers': suppliersRoutes,
  'inventory/locations': locationsRoutes,
  'distribution/customer-return': customerReturnsRoutes,
  'inventory/stock': stockRoutes,
  'distribution/outbound-shipment': outboundShipmentsRoutes,
  'replenishment/inbound-shipment': inboundShipmentsRoutes,
  'catalogue/items': itemsRoutes,
  'catalogue/master-lists': masterListsRoutes,
  'dispensary/patients': patientsRoutes,
  'dispensary/clinicians': cliniciansRoutes,
  'dispensary/prescription': prescriptionsRoutes,
  reports: reportsRoutes,
  settings: settingsRoutes,
  help: helpRoutes,
};

export const App: Component = () => {
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
    const [status] = await Promise.all([
      graphqlFetch(InitialisationStatus, {}),
      fetchServerInfo(),
    ]);
    if (status.kind !== 'success') return;
    if (status.data.initialisationStatus.status !== 'INITIALISED') {
      setPhase('initialisation');
      return;
    }
    // A failed check is handled globally; stay in the loading phase.
    if (await checkAuth()) setPhase('operational');
  };

  onMount(() => {
    void runStartup();
    const stopTracking = startActivityTracking();
    onCleanup(stopTracking);
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
        <Match when={phase() === 'initialisation'}>
          <InitialisationPage onComplete={() => void runStartup()} />
        </Match>
        <Match when={phase() === 'operational'}>
          <Show when={authUser()} fallback={<LoginPage />}>
            {/* base matches Vite's `base` config so the same build can be
                mounted at a non-root path (e.g. the demo server's /spec
                track). import.meta.env.BASE_URL always ends in "/" (Vite's
                convention); solid-router's own root-route resolution
                doesn't strip that before concatenating an absolute `to`
                (e.g. navigate(`/${id}`) in StoreGuardLayout), producing a
                double slash — "/spec//id" — that fails to match any route
                and drops the base entirely. Trimmed here, once, at the
                source. */}
            <Router base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              {/* Store guard wraps the routed app shell; the shell mounts once and
                  pages swap inside it. One route per nav destination renders its
                  (empty) entry page until a real section is registered above. */}
              <Route path="/:storeId" component={StoreGuardLayout}>
                <Route path="/" component={ShellLayout}>
                  {/* The store root is the landing screen — the dashboard
                      (spec/dashboard S1), same page as the nav's `dashboard`
                      destination. */}
                  <Route path="/" component={DashboardPage} />
                  <For each={Object.entries(sectionRoutes)}>
                    {([path, routes]) => (
                      <Route path={`/${path}`}>{routes()}</Route>
                    )}
                  </For>
                  <For
                    each={navDestinations.filter(
                      dest => !sectionRoutes[dest.path]
                    )}
                  >
                    {dest => (
                      <Route
                        path={`/${dest.path}`}
                        component={() => <EntryPage labelKey={dest.labelKey} />}
                      />
                    )}
                  </For>
                  <Route
                    path="*"
                    component={() => <EntryPage labelKey="heading.not-found" />}
                  />
                </Route>
              </Route>
              <Route
                path="*"
                component={() => <Navigate href={resolveStorePath} />}
              />
            </Router>
            <ReLoginModal />
          </Show>
        </Match>
      </Switch>
      {/* On top of everything, including other modals. */}
      <UnexpectedErrorModal />
    </>
  );
};
