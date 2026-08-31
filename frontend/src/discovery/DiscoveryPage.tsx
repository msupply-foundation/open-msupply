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
import type { Component, JSX } from 'solid-js';
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
import type { DiscoveryHostApi, HostInfo } from './hostContract';
import { handoffPath } from './discoveryReturn';
import {
  autoconnectTarget,
  connectToServer,
  DISCOVERY_POLL_MS,
  DISCOVERY_TIMEOUT_MS,
  discoveryReturnAddress,
  frontEndHostDisplay,
  mergeServers,
  parseDiscoveryFlags,
  parseManualServer,
  readInstallMode,
  readPreviousServer,
  recordInstallMode,
  serverKey,
  STANDALONE_LOCAL_SERVER,
  standaloneSeededFailure,
  toFrontEndHost,
  type DiscoveryFlags,
  type FrontEndHost,
  type InstallMode,
} from './discovery';
import layout from '../ui/styles/LoginInitLayout.module.css';
import styles from './Discovery.module.css';

/*
 * Server discovery (spec/desktop § server discovery / § server selection) —
 * the shells' bundled pre-server screen: list the servers announcing on the
 * LAN, let the user choose one or enter one directly, auto-connect a
 * returning user, and never leave the page on a failed choice. Composed from
 * the shared boot-screen shell (LoginInitLayout — the same hero + panel as
 * Login/Initialisation, since this screen precedes both).
 *
 * The page is CONSTRUCTED against a host (./hostContract.ts, resolved once in
 * entry.tsx): the shell supplies facts and native capabilities, this
 * component owns every decision — the list's accumulation and locality
 * marking, the bounded not-found outcome, what is remembered, and the probe →
 * record → navigate ordering of a connection (discovery.ts). A page-load
 * without a host (a plain browser tab) renders NoHostPage instead; there is
 * deliberately no `if (no host)` anywhere below.
 */

// The shared boot-screen frame every outcome of this page renders in — also
// the single owner of document direction/lang in THIS document (the page is
// its own html entry, so App.tsx's owner never runs here): driven by the real
// i18n locale (RTL for ar/prs/ps), flipped live by the footer
// LanguageSelector.
const DiscoveryFrame: Component<{ children: JSX.Element }> = props => {
  // The tab names this screen too — the shell's window title while no server
  // is chosen.
  createDocumentTitle(() => 'discovery.heading');
  createEffect(() => {
    document.documentElement.dir = isRtl() ? 'rtl' : 'ltr';
    document.documentElement.lang = locale();
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

            {props.children}

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

/** Opened outside any shell (a plain browser tab): nothing here can browse
 * the network. Stated rather than left as an eternal empty search. */
export const NoHostPage: Component = () => (
  <DiscoveryFrame>
    <Alert severity="warning" testId="discovery-no-host">
      {t('discovery.no-host')}
    </Alert>
  </DiscoveryFrame>
);

export const DiscoveryPage: Component<{ host: DiscoveryHostApi }> = props => {
  // Read once: both are fixed for this page-load — the shell sets the flags
  // at navigation, and the remembered server only changes by leaving this
  // page (a successful connection navigates away).
  const flags = parseDiscoveryFlags(window.location.search);
  const previous = readPreviousServer();
  // The stored answer to "what is this device for" (discovery.ts § install
  // mode). A signal, not a read-once, because choosing rewrites the screen.
  const [mode, setMode] = createSignal(readInstallMode());

  // This machine serves everyone iff the install was built that way
  // (standalone=true, AC-DT20) OR its user said so. The launch flag wins:
  // a standalone install is never offered a choice, whatever is stored.
  const servesItself = () => flags.standalone || mode() === 'server';
  // Downstream sees ONE flag set, so StandaloneConnect, autoconnectTarget and
  // standaloneSeededFailure keep reading `flags.standalone` and need no idea
  // that a stored mode exists.
  const effective = (): DiscoveryFlags =>
    servesItself() ? { ...flags, standalone: true } : flags;

  // Nobody has decided yet, and this machine could be either — the one case
  // that gets the chooser (AC-AN21). Elsewhere the install already decided.
  const undecided = () =>
    flags.canHostServer && !flags.standalone && mode() === undefined;

  // Where the landing screen can send the user back to (AC-DT16): this page,
  // told not to bounce straight back and told the install's mode, so a
  // standalone return is never offered the chooser (AC-DT20). Passed on every
  // hand-off via the connect path (./discoveryReturn.ts).
  const returnUrl = () => discoveryReturnAddress(window.location, effective());

  const choose = (chosen: InstallMode) => {
    recordInstallMode(chosen);
    setMode(chosen);
  };

  return (
    <DiscoveryFrame>
      <Switch>
        {/* Asked once, on a machine that could serve or be served. */}
        <Match when={undecided()}>
          <ModeChooser onChoose={choose} />
        </Match>
        {/* This machine's own server, used without asking (AC-DT20). */}
        <Match when={servesItself()}>
          <StandaloneConnect
            host={props.host}
            flags={effective()}
            returnUrl={returnUrl()}
          />
        </Match>
        {/* A client install: the list. */}
        <Match when={true}>
          <ServerChooser
            host={props.host}
            flags={flags}
            previous={previous}
            returnUrl={returnUrl()}
          />
        </Match>
      </Switch>
    </DiscoveryFrame>
  );
};

/** The one-time question a machine that could be either has to answer
 * (spec/android § deployment modes: "the role is a deployment fact, not a
 * build", so the same installed app must be able to be either). Kept on this
 * page rather than given a screen of its own: it is the same pre-server
 * moment, in the same frame, and the answer decides which arm of this page
 * renders next. Remembered, so it is asked once. */
const ModeChooser: Component<{
  onChoose: (mode: InstallMode) => void;
}> = props => (
  <section class={styles.outcome} aria-labelledby="discovery-mode-heading">
    <h2 id="discovery-mode-heading" class={styles.sectionHeading}>
      {t('discovery.mode-heading')}
    </h2>
    <div class={styles.modeChoices}>
      <Button
        variant="secondary"
        onClick={() => props.onChoose('server')}
        data-testid="discovery-mode-server"
      >
        {t('discovery.mode-server')}
      </Button>
      <Button
        variant="secondary"
        onClick={() => props.onChoose('client')}
        data-testid="discovery-mode-client"
      >
        {t('discovery.mode-client')}
      </Button>
    </div>
  </section>
);

// The landing path of every successful connection: login, carrying the way
// back here (AC-DT16) and the language active at click time (chosen on this
// page, unreachable across origins otherwise — AC-DT23/24). One place, so
// chosen, entered, remembered and standalone servers all get it.
const landingPath = (returnUrl: string) => handoffPath(returnUrl, locale());

/** A standalone install: its own server answers, or the failure is stated
 * with a retry — never a chooser (AC-DT20, spec § standalone
 * auto-connection). */
const StandaloneConnect: Component<{
  host: DiscoveryHostApi;
  flags: DiscoveryFlags;
  returnUrl: string;
}> = props => {
  // Not connected to the install's own server. Seeded when the launch flags
  // mean no attempt will be made (the user chose to come back, or the shell's
  // own launch check already elapsed): the state is stated with its retry
  // rather than left as a "connecting" spinner nothing is driving (AC-DT9's
  // bounded-wait principle).
  const [failed, setFailed] = createSignal(
    standaloneSeededFailure(props.flags)
  );

  // Cleanup must make in-flight work INERT, not merely stop it: an attempt
  // resolving after unmount must not write signals. Checked after every await.
  let disposed = false;
  onCleanup(() => (disposed = true));

  const attempt = async () => {
    setFailed(false);
    // A standalone install always reconnects to its own server, so there is
    // nothing to remember (AC-DT20/21).
    const connected = await connectToServer(
      props.host,
      STANDALONE_LOCAL_SERVER,
      { path: landingPath(props.returnUrl), remember: false }
    );
    if (disposed || connected) return;
    setFailed(true);
  };

  onMount(() => {
    // The install's own server is used without asking (AC-DT20) — but never
    // after the shell's launch check failed or the user chose to come back
    // (AC-DT2, AC-DT16).
    if (autoconnectTarget(props.flags, undefined)) void attempt();
  });

  return (
    <Switch>
      <Match when={failed()}>
        <div class={styles.outcome}>
          <Alert severity="error" testId="discovery-standalone-error">
            {t('discovery.standalone-unreachable')}
          </Alert>
          <Button
            variant="secondary"
            onClick={() => void attempt()}
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
          <span aria-hidden="true">{t('discovery.connecting-standalone')}</span>
        </div>
      </Match>
    </Switch>
  );
};

/** A client install: the announced-server list, manual entry, and the
 * auto-connection to a remembered server. */
const ServerChooser: Component<{
  host: DiscoveryHostApi;
  flags: DiscoveryFlags;
  previous: FrontEndHost | undefined;
  returnUrl: string;
}> = props => {
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
    props.flags.timedout && props.previous
      ? frontEndHostDisplay(props.previous)
      : undefined
  );
  const [manualUrl, setManualUrl] = createSignal(
    props.previous ? frontEndHostDisplay(props.previous) : 'https://'
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

  // This machine's facts, re-read per search (the network can change while
  // the page is open) — every poll of that search computes locality and
  // display addresses against them (discovery.ts § toFrontEndHost).
  let hostInfo: HostInfo | undefined;

  const poll = async () => {
    const result = await props.host.announcements().catch(() => undefined);
    if (disposed || !result || !hostInfo) return;
    const info = hostInfo;
    setServers(current =>
      mergeServers(
        current,
        result.announcements.map(a => toFrontEndHost(a, info))
      )
    );
    // Finding anything at all cancels the not-found outcome (AC-DT10).
    if (servers().length > 0) {
      if (timeoutTimer != null) clearTimeout(timeoutTimer);
      timeoutTimer = undefined;
      setNotFound(false);
    }
  };

  // Start (or restart) the search. Searching again starts clean (AC-DT11): a
  // server that has gone away does not persist in the list.
  const search = async () => {
    stopTimers();
    batch(() => {
      setServers([]);
      setNotFound(false);
    });
    hostInfo = await props.host.hostInfo().catch(() => hostInfo);
    if (disposed) return;
    props.host.startDiscovery();
    pollTimer = setInterval(() => void poll(), DISCOVERY_POLL_MS);
    timeoutTimer = setTimeout(() => {
      void (async () => {
        // One last read before deciding. The interval's final tick is up to
        // DISCOVERY_POLL_MS before this moment, so a server that announced
        // in between is sitting in the host's list unpolled — reaching the
        // not-found outcome with it there is exactly what AC-DT10 forbids.
        await poll();
        if (disposed) return;
        // An empty list now means the wait genuinely elapsed with nothing
        // (AC-DT9). Stop polling — the outcome offers "search again" rather
        // than silently continuing.
        if (servers().length === 0) {
          stopTimers();
          setNotFound(true);
        }
      })();
    }, DISCOVERY_TIMEOUT_MS);
  };

  // One connection attempt (its ordering in discovery.ts § connectToServer:
  // probe, record, navigate). Failure leaves the user HERE, list intact, told
  // which server could not be connected to (AC-DT12).
  const connect = async (server: FrontEndHost, key: string) => {
    if (connecting() !== undefined) return;
    batch(() => {
      setConnecting(key);
      setFailedServer(undefined);
    });
    const connected = await connectToServer(props.host, server, {
      path: landingPath(props.returnUrl),
      remember: true,
    });
    // Connected: the window is navigating away — leave the row's spinner on.
    if (disposed || connected) return;
    batch(() => {
      setConnecting(undefined);
      setFailedServer(frontEndHostDisplay(server));
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

  onMount(() => {
    // A remembered server is used without asking (AC-DT1); the search still
    // runs beneath the attempt so a failure lands on a ready list. Never
    // after the shell's launch check failed or the user chose to come back
    // (AC-DT2, AC-DT16).
    const target = autoconnectTarget(props.flags, props.previous);
    if (target) void connect(target, serverKey(target));
    void search();
  });

  return (
    <>
      <Show when={failedServer()}>
        {/* Told which server could not be connected to, still on the list
            (AC-DT2, AC-DT12). role=alert announces it when a choice fails
            live. */}
        <Alert severity="error" testId="discovery-connect-error">
          {t('error.unable-to-connect', { server: failedServer()! })}
        </Alert>
      </Show>

      <section aria-labelledby="discovery-servers-heading">
        <div class={styles.sectionHead}>
          <h2 id="discovery-servers-heading" class={styles.sectionHeading}>
            {t('discovery.select-server')}
          </h2>
          <IconButton
            icon={<RefreshIcon />}
            label={t('discovery.search-again')}
            size="small"
            onClick={() => void search()}
            data-testid="discovery-refresh"
          />
        </div>

        <Switch>
          <Match when={notFound()}>
            {/* The bounded wait elapsed: a stated outcome with a way to
                search again, not an unbounded spinner (AC-DT9). */}
            <div class={styles.outcome}>
              <Alert severity="warning" testId="discovery-not-found">
                {t('error.server-not-found')}
              </Alert>
              <Button
                variant="secondary"
                icon={<RefreshIcon />}
                onClick={() => void search()}
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
            <ul class={styles.serverList} data-testid="discovery-server-list">
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
                        {/* Marked as this machine's own server (AC-DT5) —
                            icon + text, not icon alone. */}
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
    </>
  );
};
