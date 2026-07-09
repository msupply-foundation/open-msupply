import { createEffect, createSignal, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
import type { Component, JSX } from 'solid-js';
import { Navigate, Route, Router } from '@solidjs/router';
import { graphqlFetch } from './api/graphql';
import { detectLocale, initialiseLocale, isRtl, locale, t } from './intl';
import { InitialisationStatus } from './api/initialisation.generated';
import { authUser, checkAuth, startActivityTracking } from './auth/authContext';
import { InitialisationPage } from './initialisation/InitialisationPage';
import { resolveStorePath, StoreGuardLayout } from './store/StoreGuardLayout';
import { navDestinations } from './nav/navConfig';
import { stocktakesRoutes } from './sections/stocktakes';
import { ShellLayout } from './nav/ShellLayout';
import { EntryPage } from './nav/EntryPage';
import { LoginPage } from './auth/LoginPage';
import { ReLoginModal } from './auth/ReLoginModal';
import { UnexpectedErrorModal } from './UnexpectedErrorModal';
import styles from './ui/styles/shared.module.css';

type Phase = 'loading' | 'initialisation' | 'operational';

// Nav destinations that have a real, implemented section (kdd/explicit-composition:
// one traceable place to see which sections are built). Keyed by their navConfig
// path; each value is a factory returning the section's nested route tree (list +
// detail etc.), whose view components are lazy. Every other destination falls back
// to EntryPage.
const sectionRoutes: Record<string, () => JSX.Element> = {
  'inventory/stocktakes': stocktakesRoutes,
};

export const App: Component = () => {
  const [phase, setPhase] = createSignal<Phase>('loading');

  // Spec (Startup Flow): initialisation status → me check → login or routing. The
  // original URL is never navigated away from, so the destination is respected.
  const runStartup = async () => {
    setPhase('loading');
    // Load the detected locale's dictionary before anything renders, so the app
    // never flashes untranslated keys. Failures leave an empty dictionary and t()
    // falls back to keys — startup continues regardless.
    await initialiseLocale(detectLocale());
    const status = await graphqlFetch(InitialisationStatus, {});
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
  // (RTL for ar/prs/ps). The footer LanguageSelector flips the locale; the shell
  // no longer sets dir itself.
  createEffect(() => {
    document.documentElement.dir = isRtl() ? 'rtl' : 'ltr';
    document.documentElement.lang = locale();
  });

  return (
    <>
      <Switch>
        <Match when={phase() === 'loading'}>
          <div class={styles.page}>
            <p>{t('app.loading')}</p>
          </div>
        </Match>
        <Match when={phase() === 'initialisation'}>
          <InitialisationPage onComplete={() => void runStartup()} />
        </Match>
        <Match when={phase() === 'operational'}>
          <Show when={authUser()} fallback={<LoginPage />}>
            <Router>
              {/* Store guard wraps the routed app shell; the shell mounts once and
                  pages swap inside it. One route per nav destination renders its
                  (empty) entry page until a real section is registered above. */}
              <Route path="/:storeId" component={StoreGuardLayout}>
                <Route path="/" component={ShellLayout}>
                  <Route path="/" component={() => <EntryPage labelKey="nav.dashboard" />} />
                  <For each={Object.entries(sectionRoutes)}>
                    {([path, routes]) => <Route path={`/${path}`}>{routes()}</Route>}
                  </For>
                  <For each={navDestinations.filter((dest) => !sectionRoutes[dest.path])}>
                    {(dest) => (
                      <Route
                        path={`/${dest.path}`}
                        component={() => <EntryPage labelKey={dest.labelKey} />}
                      />
                    )}
                  </For>
                  <Route path="*" component={() => <EntryPage labelKey="app.not-found" />} />
                </Route>
              </Route>
              <Route path="*" component={() => <Navigate href={resolveStorePath} />} />
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
