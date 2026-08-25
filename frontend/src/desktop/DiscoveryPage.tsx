import {
  batch,
  createEffect,
  createSignal,
  For,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from 'solid-js';
import type { Component } from 'solid-js';
import { changeLanguage, isRtl, locale, t } from '../intl';
import { createDocumentTitle } from '../documentTitle';
import { generateUUID } from '../uuid';
import { Alert } from '../ui/elements/feedback/Alert';
import { Spinner } from '../ui/elements/feedback/Spinner';
import { Button } from '../ui/elements/buttons/Button';
import { IconButton } from '../ui/elements/buttons/IconButton';
import { TextField } from '../ui/elements/inputs/TextField';
import { HomeIcon, RefreshIcon } from '../ui/icons';
import { AppLogo } from '../ui/branding/AppLogo';
import { LanguageSelector } from '../ui/layout/AppShell/LanguageSelector';
import { getDesktopHost, type FrontEndHost } from './hostBridge';
import { handoffPath } from './discoveryReturn';
import {
  autoconnectTarget,
  DISCOVERY_POLL_MS,
  DISCOVERY_TIMEOUT_MS,
  discoveryReturnAddress,
  frontEndHostDisplay,
  mergeServers,
  parseDiscoveryFlags,
  parseManualServer,
  readPreviousServer,
  recordPreviousServer,
  serverKey,
  STANDALONE_LOCAL_SERVER,
  standaloneSeededFailure,
} from './discovery';
import layout from '../ui/styles/LoginInitLayout.module.css';
import styles from './Discovery.module.css';

/*
 * Server discovery (spec/desktop § server discovery / § server selection) —
 * the desktop shell's bundled pre-server screen: list the servers announcing
 * on the LAN, let the user choose one or enter one directly, auto-connect a
 * returning user, and never leave the page on a failed choice. Composed from
 * the shared boot-screen shell (LoginInitLayout — the same hero + panel as
 * Login/Initialisation, since this screen precedes both).
 *
 * The page runs against the host bridge (./hostBridge): the shell browses
 * announcements and answers connectToServer; this component owns the list's
 * accumulation, the bounded not-found outcome, and what is remembered.
 */
export const DiscoveryPage: Component = () => {
  // The tab names this screen too — the shell's window title while no server
  // is chosen.
  createDocumentTitle(() => 'discovery.heading');

  // The single owner of document direction/lang in THIS document — the page
  // is its own bundle, so App.tsx's owner (which plays this role for the
  // app's document) never runs here. Same pattern: driven by the real i18n
  // locale (RTL for ar/prs/ps), flipped live by the footer LanguageSelector.
  createEffect(() => {
    document.documentElement.dir = isRtl() ? 'rtl' : 'ltr';
    document.documentElement.lang = locale();
  });

  const host = getDesktopHost();
  // Read once: both are fixed for this page-load — the shell sets the flags
  // at navigation, and the remembered server only changes by leaving this
  // page (a successful connection navigates away).
  const flags = parseDiscoveryFlags(window.location.search);
  const previous = readPreviousServer();
  // Where the landing screen can send the user back to (AC-DT16): this page,
  // told not to bounce straight back and told the install's mode, so a
  // standalone return is never offered the chooser (AC-DT20). Passed on every
  // hand-off via the connect path (./discoveryReturn.ts).
  const returnUrl = discoveryReturnAddress(window.location, flags);

  const [servers, setServers] = createSignal<FrontEndHost[]>([]);
  // The bounded wait elapsed with nothing found (AC-DT9).
  const [notFound, setNotFound] = createSignal(false);
  // Key of the server a connection attempt is in flight for ('manual' for the
  // entered URL) — one attempt at a time, and the row shows it.
  const [connecting, setConnecting] = createSignal<string>();
  // Display address of the server a choice (or the launch check) failed for —
  // the "could not be connected to" notice (AC-DT2, AC-DT12). Seeded from
  // ?timedout: the shell's own launch check already failed on the remembered
  // server before it showed this page.
  const [failedServer, setFailedServer] = createSignal<string | undefined>(
    flags.timedout && previous ? frontEndHostDisplay(previous) : undefined
  );
  // Standalone only: not connected to the install's own server. A standalone
  // install is never offered a choice (AC-DT20), so this is a stated error,
  // not a fallback to the list (spec § standalone auto-connection). Seeded
  // like failedServer: when the launch flags mean no attempt will be made,
  // the state is stated with its retry rather than left as a "connecting"
  // spinner nothing is driving.
  const [standaloneFailed, setStandaloneFailed] = createSignal(
    standaloneSeededFailure(flags)
  );
  const [manualUrl, setManualUrl] = createSignal(
    previous ? frontEndHostDisplay(previous) : 'https://'
  );
  const [manualError, setManualError] = createSignal<string>();

  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
  // Cleanup must make the in-flight work INERT, not merely cancel timers: a
  // poll or connection attempt resolving after unmount must not write signals
  // or storage. Checked after every await.
  let disposed = false;
  const stopTimers = () => {
    if (pollTimer != null) clearInterval(pollTimer);
    if (timeoutTimer != null) clearTimeout(timeoutTimer);
    pollTimer = timeoutTimer = undefined;
  };
  onCleanup(() => {
    disposed = true;
    stopTimers();
  });

  const poll = async () => {
    if (!host) return;
    const result = await host.discoveredServers().catch(() => undefined);
    if (disposed || !result) return;
    setServers(current => mergeServers(current, result.servers));
    // Finding anything at all cancels the not-found outcome (AC-DT10).
    if (servers().length > 0) {
      if (timeoutTimer != null) clearTimeout(timeoutTimer);
      timeoutTimer = undefined;
      setNotFound(false);
    }
  };

  // Start (or restart) the search. Searching again starts clean (AC-DT11): a
  // server that has gone away does not persist in the list.
  const search = () => {
    if (!host || flags.standalone) return;
    stopTimers();
    batch(() => {
      setServers([]);
      setNotFound(false);
    });
    host.startServerDiscovery();
    pollTimer = setInterval(() => void poll(), DISCOVERY_POLL_MS);
    timeoutTimer = setTimeout(() => {
      // Poll results land through setServers above; an empty list here means
      // the wait genuinely elapsed with nothing (AC-DT9). Stop polling — the
      // outcome offers "search again" rather than silently continuing.
      if (servers().length === 0) {
        stopTimers();
        setNotFound(true);
      }
    }, DISCOVERY_TIMEOUT_MS);
  };

  // One connection attempt. The host checks the server answers before
  // navigating; failure leaves the user HERE, list intact, told which server
  // could not be connected to (AC-DT12). Success records the choice — only
  // after the answer check, so a server that never connected is never
  // remembered (spec/desktop/README.md § Status: the current shell's
  // remember-at-choice gap, deliberately not reproduced).
  const connect = async (server: FrontEndHost, key: string) => {
    if (!host || connecting() !== undefined) return;
    batch(() => {
      setConnecting(key);
      setFailedServer(undefined);
    });
    const result = await host
      // Land on login, carrying the way back here (AC-DT16) and the active
      // language (chosen on this page, unreachable across origins otherwise)
      // — one place, so chosen, entered, remembered and standalone servers
      // all get it.
      .connectToServer({ ...server, path: handoffPath(returnUrl, locale()) })
      .catch((e: unknown) => ({ success: false, error: String(e) }));
    if (disposed) return;
    if (result.success) {
      // The window is about to navigate to the server; remember it for the
      // next launch (AC-DT13/14). A standalone install always reconnects to
      // its own server regardless, so there is nothing to record.
      if (!flags.standalone) recordPreviousServer(server);
      return;
    }
    batch(() => {
      setConnecting(undefined);
      if (flags.standalone) setStandaloneFailed(true);
      else setFailedServer(frontEndHostDisplay(server));
    });
  };

  const chooseServer = (server: FrontEndHost) =>
    void connect(server, serverKey(server));

  const submitManual = (event: SubmitEvent) => {
    event.preventDefault();
    const server = parseManualServer(manualUrl(), generateUUID().toUpperCase());
    if (!server) {
      setManualError(t('error.invalid-url'));
      return;
    }
    setManualError(undefined);
    void connect(server, 'manual');
  };

  const retryStandalone = () => {
    setStandaloneFailed(false);
    void connect(STANDALONE_LOCAL_SERVER, 'standalone');
  };

  onMount(() => {
    if (!host) return;
    // A remembered server (or a standalone install's own) is used without
    // asking (AC-DT1, AC-DT20); the search still runs beneath the attempt so
    // a failure lands on a ready list. Never after the shell's launch check
    // failed or the user chose to come back (AC-DT2, AC-DT16).
    const target = autoconnectTarget(flags, previous);
    if (target)
      void connect(target, flags.standalone ? 'standalone' : serverKey(target));
    search();
  });

  return (
    <div class={layout.page}>
      <section class={layout.hero} aria-label={t('discovery.heading')}>
        <h1 class={layout.heroHeading}>
          {t('discovery.heading')} {t('discovery.sub-heading')}
        </h1>
        <p class={layout.heroBody}>{t('discovery.body')}</p>
      </section>

      <main class={layout.panel}>
        <div class={layout.formArea}>
          <div class={styles.column}>
            <AppLogo class={layout.logo} />

            <Show when={!host}>
              {/* Opened outside the desktop shell (a plain browser tab):
                  nothing here can browse the network. Stated rather than left
                  as an eternal empty search. */}
              <Alert severity="warning" testId="discovery-no-host">
                {t('discovery.no-host')}
              </Alert>
            </Show>

            <Show when={host && flags.standalone}>
              {/* A standalone install is never offered a choice (AC-DT20):
                  its own server answers, or the failure is stated. */}
              <Switch>
                <Match when={standaloneFailed()}>
                  <div class={styles.outcome}>
                    <Alert severity="error" testId="discovery-standalone-error">
                      {t('discovery.standalone-unreachable')}
                    </Alert>
                    <Button
                      variant="secondary"
                      onClick={retryStandalone}
                      data-testid="discovery-standalone-retry"
                    >
                      {t('button.retry')}
                    </Button>
                  </div>
                </Match>
                <Match when={true}>
                  <div class={styles.searching} role="status">
                    <Spinner
                      sizeRem={1.25}
                      label={t('discovery.connecting-standalone')}
                    />
                    <span aria-hidden="true">
                      {t('discovery.connecting-standalone')}
                    </span>
                  </div>
                </Match>
              </Switch>
            </Show>

            <Show when={host && !flags.standalone}>
              <Show when={failedServer()}>
                {/* Told which server could not be connected to, still on the
                    list (AC-DT2, AC-DT12). role=alert announces it when a
                    choice fails live. */}
                <Alert severity="error" testId="discovery-connect-error">
                  {t('error.unable-to-connect', { server: failedServer()! })}
                </Alert>
              </Show>

              <section aria-labelledby="discovery-servers-heading">
                <div class={styles.sectionHead}>
                  <h2
                    id="discovery-servers-heading"
                    class={styles.sectionHeading}
                  >
                    {t('discovery.select-server')}
                  </h2>
                  <IconButton
                    icon={<RefreshIcon />}
                    label={t('discovery.search-again')}
                    size="small"
                    onClick={search}
                    data-testid="discovery-refresh"
                  />
                </div>

                <Switch>
                  <Match when={notFound()}>
                    {/* The bounded wait elapsed: a stated outcome with a way
                        to search again, not an unbounded spinner (AC-DT9). */}
                    <div class={styles.outcome}>
                      <Alert severity="warning" testId="discovery-not-found">
                        {t('error.server-not-found')}
                      </Alert>
                      <Button
                        variant="secondary"
                        icon={<RefreshIcon />}
                        onClick={search}
                        data-testid="discovery-search-again"
                      >
                        {t('discovery.search-again')}
                      </Button>
                    </div>
                  </Match>
                  <Match when={servers().length === 0}>
                    <div class={styles.searching} role="status">
                      <Spinner sizeRem={1.25} label={t('searching')} />
                      <span aria-hidden="true">{t('searching')}</span>
                    </div>
                  </Match>
                  <Match when={true}>
                    <ul
                      class={styles.serverList}
                      data-testid="discovery-server-list"
                    >
                      <For each={servers()}>
                        {server => (
                          <li>
                            <button
                              type="button"
                              class={styles.serverRow}
                              disabled={connecting() !== undefined}
                              onClick={() => chooseServer(server)}
                              data-testid="discovery-server"
                              data-server-key={serverKey(server)}
                            >
                              <span class={styles.serverAddress}>
                                {frontEndHostDisplay(server)}
                              </span>
                              <Show when={server.isLocal}>
                                {/* Marked as this machine's own server
                                    (AC-DT5) — icon + text, not icon alone. */}
                                <span class={styles.thisMachine}>
                                  <HomeIcon />
                                  {t('discovery.this-machine')}
                                </span>
                              </Show>
                              <Show when={connecting() === serverKey(server)}>
                                <Spinner
                                  sizeRem={1}
                                  label={t('discovery.connecting')}
                                />
                              </Show>
                            </button>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Match>
                </Switch>
              </section>

              <form onSubmit={submitManual}>
                <div class={styles.manualRow}>
                  <div class={styles.manualField}>
                    <TextField
                      label={t('discovery.manual-url')}
                      type="text"
                      name="server-url"
                      autocomplete="off"
                      value={manualUrl()}
                      onInput={e => setManualUrl(e.currentTarget.value)}
                      error={manualError()}
                      errorTestId="discovery-manual-url-error"
                      data-testid="discovery-manual-url-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="secondary"
                    class={styles.manualConnect}
                    loading={connecting() === 'manual'}
                    data-testid="discovery-manual-connect"
                  >
                    {t('button.connect')}
                  </Button>
                </div>
              </form>
            </Show>

            <div class={layout.formActions}>
              <div class={layout.languageAction}>
                <LanguageSelector
                  language={locale()}
                  onSelect={v => void changeLanguage(v)}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
