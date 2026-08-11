import { batch, createSignal, onCleanup, onMount, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '../api/graphql';
import {
  InitialisationStatus,
  InitialiseAsCentralServer,
  InitialiseSite,
  LatestSyncStatus,
  ManualSync,
  SyncInfoUpdated,
  type InitialiseAsCentralServerResult,
  type SyncStatusFragment,
} from '../api/initialisation.generated';
import { subscribe } from '../api/subscription';
import { isCentralServer, serverVersion } from '../api/serverInfo';
import {
  toSyncOverview,
  type SyncError,
  type SyncOverview,
} from '../sections/sync-modal/syncStatus';
import { syncErrorSummary } from '../sections/sync-modal/syncErrors';
import { initialiseStep } from './initialiseRetry';
import { SyncProgress } from './SyncProgress';
import { TextField } from '../ui/elements/inputs/TextField';
import { PasswordField } from '../ui/elements/inputs/PasswordField';
import { NumberField } from '../ui/elements/inputs/NumberField';
import { Button } from '../ui/elements/buttons/Button';
import { Alert } from '../ui/elements/feedback/Alert';
import { ErrorDetails } from '../ui/elements/feedback/ErrorDetails';
import { Tabs, TabList, TabPanel } from '../ui/elements/tabs/Tabs';
import { isAndroid } from '../platform';
import { AppLogo } from '../ui/branding/AppLogo';
import { LanguageSelector } from '../ui/layout/AppShell/LanguageSelector';
import {
  DEFAULT_SYNC_INTERVAL_SECONDS,
  INITIALISE_RETRY_INTERVAL_MS,
  SYNC_POLL_INTERVAL_MS,
} from '../config';
import { changeLanguage, locale, t } from '../intl';
import { SaveServerLogLink } from '../platform/SaveServerLogLink';
import styles from '../ui/styles/LoginInitLayout.module.css';
import pageStyles from './Initialisation.module.css';

export const InitialisationPage: Component<{
  onComplete: () => void;
}> = props => {
  const [values, setValues] = createSignal({
    // Spec (issue #519.2): pre-fill the scheme so the user only types the host
    // — the central server is always reached over https. Matches the current
    // app.
    url: 'https://',
    siteName: '',
    password: '',
    batchSize: undefined as number | undefined,
  });
  const [fieldErrors, setFieldErrors] = createSignal({
    url: '',
    siteName: '',
    password: '',
  });
  const [showAdvanced, setShowAdvanced] = createSignal(false);
  // Spec: distinct from submitting — sync has actually begun (the mutation
  // started it, or the page resumed into INITIALISING). A sync error before
  // this is true means initialisation never started, so Retry (which re-runs
  // manualSync) would have nothing to retry — see OMS-REG-LGN-03.11.
  const [syncStarted, setSyncStarted] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);
  const [syncError, setSyncError] = createSignal<SyncError>();
  // Spec (OMS-REG-LGN-03.19): the silent wait for the central server is NOT
  // an error — the fields stay locked and the button stays busy — so it
  // cannot ride on syncError(); locked()/busy() hold via submitting() alone.
  const [waitingForCentral, setWaitingForCentral] = createSignal(false);
  const [overview, setOverview] = createSignal<SyncOverview>();

  let disposeWatch: (() => void) | undefined;
  let retryTimer: number | undefined;
  // Cleanup must make the retry loop INERT, not merely cancel its timer: an
  // attempt in flight when the page unmounts would resolve afterwards and
  // start a watch nothing will ever dispose. Checked after every await.
  let disposed = false;
  onCleanup(() => {
    disposed = true;
    if (retryTimer != null) clearTimeout(retryTimer);
    disposeWatch?.();
  });

  const handleStatus = (status: SyncStatusFragment | null | undefined) => {
    const next = toSyncOverview(status, {
      operational: false,
      centralServer: isCentralServer(),
    });
    if (!next) return;
    setOverview(next);
    if (next.error != null) {
      setSyncError(next.error);
      return;
    }
    if (next.succeeded) {
      disposeWatch?.();
      disposeWatch = undefined;
      void confirmInitialised();
    }
  };

  const confirmInitialised = async () => {
    const result = await graphqlFetch(InitialisationStatus, {});
    // Failures are handled globally; stay in the progress phase.
    if (result.kind !== 'success') return;
    if (result.data.initialisationStatus.status === 'INITIALISED') {
      // Spec: on success, revert back to the startup flow — which re-checks
      // authentication, so all auth/store state is fetched fresh.
      props.onComplete();
    }
  };

  // Spec: try the sync status subscription first; fall back to polling. A
  // subscription only pushes on CHANGE — establishing it proves the channel is
  // live but delivers nothing on its own, so a resumed/reconnected watch would
  // otherwise sit on "waiting for sync status" until the next status change.
  // One immediate one-shot fetch alongside starting the watch closes that gap
  // regardless of which transport ends up serving subsequent updates.
  const watchProgress = () => {
    disposeWatch?.();
    void graphqlFetch(LatestSyncStatus, {}, { background: true }).then(
      result => {
        if (result.kind === 'success')
          handleStatus(result.data.latestSyncStatus);
      }
    );
    let poller: number | undefined;
    const disposeSubscription = subscribe(SyncInfoUpdated, undefined, {
      onData: data => handleStatus(data.syncInfoUpdated.syncStatus),
      onFailure: () => {
        poller = window.setInterval(() => {
          void graphqlFetch(LatestSyncStatus, {}, { background: true }).then(
            result => {
              // Transient poll failures are ignored (background: no global
              // unexpected-error modal); the next tick retries.
              if (result.kind === 'success')
                handleStatus(result.data.latestSyncStatus);
            }
          );
        }, SYNC_POLL_INTERVAL_MS);
      },
    });
    disposeWatch = () => {
      disposeSubscription();
      if (poller != null) clearInterval(poller);
    };
  };

  onMount(() => {
    void graphqlFetch(InitialisationStatus, {}).then(result => {
      if (result.kind !== 'success') return;
      // Already initialising (e.g. page reload mid-initialisation): lock
      // inputs, show the known site name, watch progress.
      const { initialisationStatus } = result.data;
      if (initialisationStatus.status === 'INITIALISING') {
        setValues(previous => ({
          ...previous,
          siteName: initialisationStatus.siteName ?? '',
        }));
        setSyncStarted(true);
        watchProgress();
      }
    });
  });

  // Spec (issue #519.3): validate the URL on the front end so a malformed one
  // (e.g. no scheme — "mysite.example.com") never reaches initialiseSite. The
  // server rejects such a URL with an unstructured "Internal error", which
  // would trip the global unexpected-error modal whose only recovery is a full
  // reload, wiping everything the user typed. Caught here it is a plain inline
  // field error and the form (and the other fields) stay put.
  //
  // The URL must be the authority form — start with "http://" or "https://" and
  // carry a host. The scheme:// prefix check is deliberate: `new URL()` alone
  // accepts scheme-colon-without-slashes for special schemes (`http:dsfadsf`
  // parses with host "dsfadsf"), which is never a real central-server address.
  // The bare default "https://" fails the host check, same as an empty field.
  // Whether the host actually resolves is the server's job — an unreachable but
  // well-formed address comes back as a structured CONNECTION_ERROR shown
  // inline.
  const urlError = (raw: string): string => {
    const value = raw.trim();
    if (value === '') return t('error.url-required');
    if (!/^https?:\/\//i.test(value)) return t('error.invalid-url');
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      return t('error.invalid-url');
    }
    if (parsed.hostname === '') return t('error.invalid-url');
    return '';
  };

  const validate = (): boolean => {
    const current = values();
    const errors = {
      url: urlError(current.url),
      siteName:
        current.siteName.trim() === '' ? t('error.site-name-required') : '',
      password:
        current.password.trim() === '' ? t('error.password-required') : '',
    };
    setFieldErrors(errors);
    return Object.values(errors).every(message => message === '');
  };

  // One initialise attempt. The user's own submit (retriesUsed 0) keeps the
  // default global error handling (OMS-REG-LGN-03.17); the silent retries are
  // background calls — a transport blip mid-wait must not raise the global
  // modal, whose only recovery is a reload that wipes the URL, site name and
  // password just typed (spec/startup contract § Initialisation). values() is
  // read fresh per attempt (the fields are locked, so it cannot change — but a
  // handler never snapshots state it will re-consult).
  const attemptInitialise = (retriesUsed: number) =>
    graphqlFetch(
      InitialiseSite,
      {
        input: {
          url: values().url,
          username: values().siteName,
          password: values().password,
          // Spec: not user-editable — always the default (OMS-REG-LGN-03.3).
          intervalSeconds: DEFAULT_SYNC_INTERVAL_SECONDS,
          batchSize: values().batchSize,
        },
      },
      retriesUsed === 0 ? undefined : { background: true }
    );

  const waitBeforeRetry = () =>
    new Promise<void>(resolve => {
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        resolve();
      }, INITIALISE_RETRY_INTERVAL_MS);
    });

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    // Spec: the button is always clickable; validation errors show on click.
    if (!validate()) return;
    setSubmitting(true);
    setSyncError(undefined);

    // Spec (OMS-REG-LGN-03.18): the one transient sync error — the central
    // server has not yet prepared this site — is waited out with silent
    // retries instead of shown; classification and the retry budget are
    // initialiseStep's (initialiseRetry.ts). Re-entrancy needs no guard: every
    // input and the submit button are disabled for the whole loop (locked()).
    let waitingError: SyncError | undefined;
    for (let retriesUsed = 0; ; retriesUsed++) {
      const result = await attemptInitialise(retriesUsed);
      if (disposed) return;

      const step = initialiseStep(result, retriesUsed, waitingError);
      if (step.kind === 'retry') {
        // Spec (OMS-REG-LGN-03.19): still not started — hold the lock, show
        // the waiting notice in place of the error. Setting the same value
        // again is a no-op, so the notice announces once, not once per retry.
        waitingError = step.error;
        setWaitingForCentral(true);
        await waitBeforeRetry();
        if (disposed) return;
        continue;
      }
      // The terminal transition runs in an async continuation, which Solid
      // does not auto-batch — un-batched, setSubmitting(false) lands a frame
      // before setSyncError(...), flashing an unlocked, errorless form.
      batch(() => {
        setWaitingForCentral(false);
        // Whatever the outcome, the submitting state is released (spec,
        // Unexpected API errors / OMS-REG-LGN-03.11/.17/.21): a 'released'
        // step shows nothing of its own (the global modal owns it), a
        // 'failed' step shows the error with the button back on Initialise,
        // and a 'started' step hands over to the started state below.
        setSubmitting(false);
        if (step.kind === 'started') setSyncStarted(true);
        else if (step.kind === 'failed') setSyncError(step.error);
      });
      if (step.kind === 'started') watchProgress();
      return;
    }
  };

  // Spec: on error the button becomes retry, calling the manual sync mutation.
  // Only reachable once syncStarted — inputs stay locked.
  //
  // The error is cleared only once a run has actually started. Clearing it up
  // front made a failed manualSync self-destructive: showRetry() went false (no
  // error) while busy() went true, so the Retry button was replaced by a
  // disabled "Initialising…" with nothing watching for status — the recovery
  // control gone while nothing was running (spec, Initialisation § retry).
  const retry = async () => {
    setSubmitting(true);
    const result = await graphqlFetch(ManualSync, {});
    setSubmitting(false);
    if (result.kind !== 'success') return;
    setSyncError(undefined);
    watchProgress();
  };

  const showRetry = () => syncStarted() && syncError() != null;
  // Spec: fields lock while the request is in flight, and stay locked for the
  // whole time sync has actually started (including a watched-sync error —
  // that's the Retry case). A sync error BEFORE syncStarted means
  // initialisation never began, so fields unlock for correction
  // (OMS-REG-LGN-03.11).
  const locked = () => submitting() || syncStarted();
  const busy = () => locked() && syncError() == null;

  // ——— Central-server initialisation (spec § initialisation, issue #895) ———
  //
  // A central server initialises against the LEGACY mSupply central with the
  // same form (only the URL label changes, OMS-REG-LGN-03.22). A
  // non-production, non-Android build additionally offers the standalone mode
  // (.23) — the server carries no signal for which kind of central it should
  // be, so the choice is the operator's. import.meta.env.PROD mirrors the
  // current app's production gate on the same chooser.
  type InitMode = 'legacy-sync' | 'standalone';
  const [mode, setMode] = createSignal<InitMode>('legacy-sync');
  const showModeChoice = () =>
    isCentralServer() && !isAndroid() && !import.meta.env.PROD;

  type StandaloneError = Extract<
    InitialiseAsCentralServerResult['initialiseAsCentralServer'],
    { __typename: 'InitialiseAsCentralServerError' }
  >['error'];
  const [standaloneValues, setStandaloneValues] = createSignal({
    storeName: '',
    username: '',
    password: '',
  });
  const [standaloneFieldErrors, setStandaloneFieldErrors] = createSignal({
    storeName: '',
    username: '',
    password: '',
  });
  const [standaloneSubmitting, setStandaloneSubmitting] = createSignal(false);
  const [standaloneError, setStandaloneError] = createSignal<StandaloneError>();
  // The chooser stays visible but inert while either mode has work in flight
  // (or a run has started) — hiding it would drop the strip mid-submit.
  const modeLocked = () => locked() || standaloneSubmitting();

  const validateStandalone = (): boolean => {
    const current = standaloneValues();
    const errors = {
      storeName:
        current.storeName.trim() === '' ? t('error.store-name-required') : '',
      username:
        current.username.trim() === '' ? t('error.username-required') : '',
      password: current.password === '' ? t('error.password-required') : '',
    };
    setStandaloneFieldErrors(errors);
    return Object.values(errors).every(message => message === '');
  };

  const submitStandalone = async (event: SubmitEvent) => {
    event.preventDefault();
    // Spec: always clickable; per-field validation on click (.24).
    if (!validateStandalone()) return;
    setStandaloneSubmitting(true);
    setStandaloneError(undefined);
    const result = await graphqlFetch(InitialiseAsCentralServer, {
      input: {
        storeName: standaloneValues().storeName.trim(),
        adminUsername: standaloneValues().username.trim(),
        adminPassword: standaloneValues().password,
      },
    });
    if (disposed) return;
    if (result.kind !== 'success') {
      // Hardware-id / database failures arrive as top-level GraphQL errors,
      // not union members (contract § initialisation wire trap): the global
      // modal owns them — release the busy state, show nothing of our own.
      setStandaloneSubmitting(false);
      return;
    }
    const outcome = result.data.initialiseAsCentralServer;
    if (outcome.__typename === 'StandaloneCentralInitialisedNode') {
      // Spec (.25): completion is immediate — the store and admin user exist,
      // initialisationStatus is already INITIALISED and no sync ever runs.
      // Hand back to startup, which re-checks everything and lands on login.
      props.onComplete();
      return;
    }
    // Async continuation — batch so the unlock and the error land in one
    // frame (never an unlocked, errorless flash).
    batch(() => {
      setStandaloneSubmitting(false);
      setStandaloneError(outcome.error);
    });
  };

  // The legacy-sync form — every non-central server's only form, the default
  // mode on a central one (OMS-REG-LGN-03.22). A closure component so its two
  // placements (bare, and as the chooser's first tab panel) share the page's
  // signals; only one renders at a time.
  const LegacySyncForm = (formProps: { withLogo?: boolean }) => (
    <form
      class={styles.form}
      aria-label={t('button.initialise')}
      onSubmit={submit}
    >
      <Show when={formProps.withLogo}>
        <AppLogo class={styles.logo} />
      </Show>
      <TextField
        // Spec (.22): a central server initialises against the LEGACY mSupply
        // central — same field, same submission, different name.
        label={
          isCentralServer()
            ? t('label.settings-legacy-url')
            : t('label.settings-url')
        }
        width="full"
        data-testid="initialise-url-input"
        value={values().url}
        onInput={e => {
          const url = e.currentTarget.value;
          setValues(previous => ({ ...previous, url }));
        }}
        error={fieldErrors().url || undefined}
        disabled={locked()}
      />
      <TextField
        label={t('label.settings-username')}
        width="full"
        data-testid="initialise-site-name-input"
        value={values().siteName}
        onInput={e => {
          const siteName = e.currentTarget.value;
          setValues(previous => ({ ...previous, siteName }));
        }}
        error={fieldErrors().siteName || undefined}
        disabled={locked()}
      />
      <PasswordField
        label={t('label.settings-password')}
        width="full"
        data-testid="initialise-password-input"
        value={values().password}
        onInput={e => {
          const password = e.currentTarget.value;
          setValues(previous => ({ ...previous, password }));
        }}
        error={fieldErrors().password || undefined}
        disabled={locked()}
      />
      <button
        type="button"
        class={pageStyles.advancedToggle}
        onClick={() => setShowAdvanced(previous => !previous)}
      >
        {showAdvanced()
          ? t('label.hide-advanced-options')
          : t('label.show-advanced-options')}
      </button>
      <Show when={showAdvanced()}>
        <NumberField
          label={t('label.settings-batch-size')}
          helperText={t('label.settings-batch-size-helper')}
          width="full"
          min={1}
          value={values().batchSize}
          onChange={batchSize =>
            setValues(previous => ({ ...previous, batchSize }))
          }
          disabled={locked()}
        />
      </Show>
      {/* Spec (OMS-REG-LGN-03.19): informational, never an error — the
          wait is expected and self-healing (D97). Mutually exclusive
          with the error Alert below: syncError() stays unset for the
          whole wait. */}
      <Show when={waitingForCentral()}>
        <Alert severity="info" testId="initialise-waiting">
          {t('messages.waiting-for-central-server')}
        </Alert>
      </Show>
      <Show when={syncError()}>
        {err => {
          const errorSummary = () => syncErrorSummary(err().variant);
          const hintText = () => {
            const h = errorSummary().hint;
            return h ? t(h) : undefined;
          };
          return (
            <Alert severity="error" testId="initialise-error">
              <div>{t(errorSummary().summary)}</div>
              <ErrorDetails detail={err().fullError} hint={hintText()} />
            </Alert>
          );
        }}
      </Show>
      {/* No run exists during the silent wait, so the progress list's
          "waiting for sync status" fallback would double the waiting
          notice above — the notice stands in its place (spec S2 §
          layout). */}
      <Show when={busy() && !waitingForCentral()}>
        <SyncProgress overview={overview()} />
      </Show>
      <div class={styles.buttonRow}>
        <Show
          when={showRetry()}
          fallback={
            <Button
              type="submit"
              disabled={busy()}
              data-testid="initialise-button"
            >
              {busy() ? t('button.initialising') : t('button.initialise')}
            </Button>
          }
        >
          {/* Disabled while the retry call is in flight so it can't be
              double-submitted; the error stays visible behind it
              (OMS-REG-LGN-03.15). */}
          <Button
            onClick={() => void retry()}
            disabled={submitting()}
            data-testid="initialise-button"
          >
            {submitting() ? t('button.initialising') : t('button.retry')}
          </Button>
        </Show>
      </div>
    </form>
  );

  // The standalone-central form (the chooser's second tab, OMS-REG-LGN-03
  // .24–.26): store name + admin credentials, no sync settings — success
  // completes initialisation immediately (spec S2 § standalone panel).
  const StandaloneCentralForm = () => (
    <form
      class={styles.form}
      aria-label={t('initialise.central-standalone')}
      onSubmit={submitStandalone}
    >
      <TextField
        label={t('label.store-name')}
        width="full"
        data-testid="initialise-store-name-input"
        value={standaloneValues().storeName}
        onInput={e => {
          const storeName = e.currentTarget.value;
          setStandaloneValues(previous => ({ ...previous, storeName }));
        }}
        error={standaloneFieldErrors().storeName || undefined}
        disabled={standaloneSubmitting()}
      />
      <p class={pageStyles.sectionHeading}>{t('heading.admin-user')}</p>
      <TextField
        label={t('heading.username')}
        width="full"
        data-testid="initialise-admin-username-input"
        value={standaloneValues().username}
        onInput={e => {
          const username = e.currentTarget.value;
          setStandaloneValues(previous => ({ ...previous, username }));
        }}
        error={standaloneFieldErrors().username || undefined}
        disabled={standaloneSubmitting()}
      />
      <PasswordField
        label={t('heading.password')}
        width="full"
        data-testid="initialise-admin-password-input"
        value={standaloneValues().password}
        onInput={e => {
          const password = e.currentTarget.value;
          setStandaloneValues(previous => ({ ...previous, password }));
        }}
        error={standaloneFieldErrors().password || undefined}
        disabled={standaloneSubmitting()}
      />
      {/* Spec (.26): only the structured union error is shown here — anything
          else already raised the global modal (contract § wire trap). */}
      <Show when={standaloneError()}>
        {err => (
          <Alert severity="error" testId="initialise-standalone-error">
            {err().description}
          </Alert>
        )}
      </Show>
      <div class={styles.buttonRow}>
        {/* Plain "Initialise", matching the legacy-sync tab — the active tab
            already says which kind (D98; the current app spells it out). */}
        <Button
          type="submit"
          disabled={standaloneSubmitting()}
          data-testid="initialise-standalone-button"
        >
          {standaloneSubmitting()
            ? t('button.initialising')
            : t('button.initialise')}
        </Button>
      </div>
    </form>
  );

  return (
    <div class={styles.page}>
      <section
        class={`${styles.hero} ${styles.heroSecondary}`}
        aria-label={t('label.about-open-msupply')}
      >
        <h1 class={styles.heroHeading}>{t('initialise.heading')}</h1>
        <p class={styles.heroBody}>{t('initialise.body')}</p>
      </section>

      <main class={styles.panel}>
        <div class={styles.formArea}>
          {/* Spec (OMS-REG-LGN-03.23): the mode chooser exists only on a
              central server in a non-production, non-Android build —
              everywhere else the legacy-sync form stands alone. */}
          <Show when={showModeChoice()} fallback={<LegacySyncForm withLogo />}>
            <div class={styles.form}>
              <AppLogo class={styles.logo} />
              <Tabs
                value={mode()}
                onValueChange={value =>
                  setMode(value === 'standalone' ? 'standalone' : 'legacy-sync')
                }
              >
                <TabList
                  label={t('initialise.mode-label')}
                  tabs={[
                    {
                      value: 'legacy-sync',
                      label: t('initialise.legacy-sync'),
                      disabled: modeLocked(),
                    },
                    {
                      value: 'standalone',
                      label: t('initialise.central-standalone'),
                      disabled: modeLocked(),
                    },
                  ]}
                />
                <TabPanel value="legacy-sync">
                  <LegacySyncForm />
                </TabPanel>
                <TabPanel value="standalone">
                  <StandaloneCentralForm />
                </TabPanel>
              </Tabs>
            </div>
          </Show>
        </div>
        <footer class={styles.panelFooter}>
          {/* Android only: save the embedded server's log for support before
              initialisation completes (issue #519.5). Renders nothing on the
              web. Styled as the footer's secondary text link (like the login
              screen's old-UI link), centered above the version. */}
          <SaveServerLogLink
            class={styles.switchLink}
            noticeClass={styles.footerNotice}
          />
          <p class={styles.version}>
            <strong>{t('label.app-version')}</strong> {APP_VERSION}
          </p>
          {/* Spec (App version, OMS-REG-LGN-01.20): absent until the startup pass has
              fetched it — pre-initialisation that also needs a server carrying
              open-msupply#12566. */}
          <Show when={serverVersion()}>
            <p class={styles.version}>
              <strong>{t('label.server-version')}</strong> {serverVersion()}
            </p>
          </Show>
          <div class={styles.languageRow}>
            <LanguageSelector
              language={locale()}
              onSelect={v => void changeLanguage(v)}
            />
          </div>
        </footer>
      </main>
    </div>
  );
};
