import { batch, createSignal, onCleanup, onMount, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch, type GraphqlResult } from '../api/graphql';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/elements/accordion/Accordion';
import { useIsCompact } from '../ui/utils/createMediaQuery';
import { FormSection } from '../ui/layout/Form/FormSection';
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
import { createDocumentTitle } from '../documentTitle';
import {
  createFormValidation,
  type FieldError,
} from '../ui/layout/Form/formValidation';
import { SaveServerLogLink } from '../platform/SaveServerLogLink';
import { ChangeServerAction } from '../ui/layout/ChangeServerAction';
import styles from '../ui/styles/LoginInitLayout.module.css';
import pageStyles from './Initialisation.module.css';

export const InitialisationPage: Component<{
  onComplete: () => void;
}> = props => {
  // The tab names this screen too (spec/chrome § document title): an
  // un-initialised site is the whole app until it finishes.
  createDocumentTitle(() => 'initialise.form-heading');

  const [values, setValues] = createSignal({
    // Spec (issue #519.2): pre-fill the scheme so the user only types the host
    // — the central server is always reached over https. Matches the current
    // app.
    url: 'https://',
    siteName: '',
    password: '',
    batchSize: undefined as number | undefined,
  });
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

  // The server flips its GraphQL schema to the authenticated one the instant
  // sync finishes (contract § initialisation wire trap) — essentially
  // synchronously with the sync record itself being marked succeeded, with no
  // guaranteed ordering between the two from a poller's point of view. A tick
  // that lands after the flip gets 'unauthenticated' instead of the terminal
  // status, and — since no one has logged in yet on this screen — every tick
  // after that does too: the re-login modal never fires pre-login (user()
  // gates it), so a plain "ignore and retry" leaves the page spinning
  // forever even though initialisation already succeeded. InitialisationStatus
  // stays public across the flip, so an unauthenticated tick re-checks THAT
  // directly instead of treating it as transient.
  const handlePollResult = (
    result: GraphqlResult<{ latestSyncStatus: SyncStatusFragment | null }>
  ) => {
    if (result.kind === 'success') {
      handleStatus(result.data.latestSyncStatus);
      return;
    }
    if (result.kind === 'unauthenticated') {
      void confirmInitialised();
    }
    // Any other transient poll failure is ignored (background: no global
    // unexpected-error modal); the next tick retries.
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
      handlePollResult
    );
    let poller: number | undefined;
    const disposeSubscription = subscribe(SyncInfoUpdated, undefined, {
      onData: data => handleStatus(data.syncInfoUpdated.syncStatus),
      onFailure: () => {
        poller = window.setInterval(() => {
          void graphqlFetch(LatestSyncStatus, {}, { background: true }).then(
            handlePollResult
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

  /*
   * The three field rules, in field order. Each carries its own message but
   * is held back until the first submit (`showOnSubmit`) — the form must open
   * quiet, and the URL field's seeded "https://" is deliberately incomplete,
   * so a message-carrying rule's default "show as soon as it trips" would
   * greet the user with an error on a form they have not touched.
   */
  const fieldErrors = (): FieldError[] => [
    {
      id: 'url',
      label: t('label.settings-url'),
      failed: urlError(values().url) !== '',
      message: urlError(values().url) || undefined,
      showOnSubmit: true,
    },
    {
      id: 'siteName',
      label: t('label.settings-username'),
      failed: values().siteName.trim() === '',
      message: t('error.site-name-required'),
      showOnSubmit: true,
    },
    {
      id: 'password',
      label: t('label.settings-password'),
      failed: values().password.trim() === '',
      message: t('error.password-required'),
      showOnSubmit: true,
    },
  ];
  const validation = createFormValidation(fieldErrors);

  const validate = (): boolean => {
    validation.arm();
    return validation.valid();
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

  // Only decides WHERE the version line renders — see versionLine() below.
  const compact = useIsCompact();

  const showRetry = () => syncStarted() && syncError() != null;
  // Spec: fields lock while the request is in flight, and stay locked for the
  // whole time sync has actually started (including a watched-sync error —
  // that's the Retry case). A sync error BEFORE syncStarted means
  // initialisation never began, so fields unlock for correction
  // (OMS-REG-LGN-03.11).
  const locked = () => submitting() || syncStarted();
  const busy = () => locked() && syncError() == null;

  // Spec (App version, OMS-REG-LGN-03.27–.29): the running build's version and
  // — once the startup pass has fetched it, never as a placeholder — the
  // server's, on one line at the bottom of the page's left half. Same line, and
  // same reasoning, as the login page's.
  //
  // ONE element, rendered either in the hero or, below the compact breakpoint
  // where the hero doesn't render at all, in the panel. Never both, so
  // `init-version` stays a single match; a CSS-only move is impossible because
  // a child of the hidden hero is hidden with it (CLAUDE.md #7 — a breakpoint
  // decides which element renders).
  const versionLine = (placement: string) => (
    <p class={`${styles.versionBar} ${placement}`} data-testid="init-version">
      <span>
        <strong>{t('label.version-interface')}</strong> {APP_VERSION}
      </span>
      <Show when={serverVersion()}>
        <span>
          <strong>{t('label.version-server')}</strong> {serverVersion()}
        </span>
      </Show>
    </p>
  );

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
  const LegacySyncForm = () => (
    <form
      class={styles.form}
      aria-labelledby="initialise-heading"
      onSubmit={submit}
    >
      {/* The form's heading, and its accessible name via aria-labelledby — the
          form previously named itself after its button, which told a
          screen-reader user what the control does, not what the region is. Not
          displayed: the logo above and the hero's welcome already carry the
          page's visible identity. h2, not h1, because the hero's welcome is the
          page's h1 and this is the top of a region within it — a plain element
          rather than the Text primitive, since an invisible heading has no type
          style to set. First in the form so it is read before the fields it
          names (matching the login page). */}
      <h2 id="initialise-heading" class={styles.srOnly}>
        {t('initialise.form-heading')}
      </h2>
      <TextField
        // Spec (.22): a central server initialises against the LEGACY mSupply
        // central — same field, same submission, different name.
        label={
          isCentralServer()
            ? t('label.settings-legacy-url')
            : t('label.settings-url')
        }
        data-testid="initialise-url-input"
        value={values().url}
        onInput={e => {
          const url = e.currentTarget.value;
          setValues(previous => ({ ...previous, url }));
        }}
        error={validation.errorFor('url')}
        disabled={locked()}
      />
      <TextField
        label={t('label.settings-username')}
        data-testid="initialise-site-name-input"
        value={values().siteName}
        onInput={e => {
          const siteName = e.currentTarget.value;
          setValues(previous => ({ ...previous, siteName }));
        }}
        error={validation.errorFor('siteName')}
        disabled={locked()}
      />
      <PasswordField
        label={t('label.settings-password')}
        data-testid="initialise-password-input"
        value={values().password}
        onInput={e => {
          const password = e.currentTarget.value;
          setValues(previous => ({ ...previous, password }));
        }}
        error={validation.errorFor('password')}
        disabled={locked()}
      />
      {/* The batch-size override behind the library disclosure
          (OMS-REG-LGN-03.9/.30) — collapsed by default, `collapsible` so a
          second activation closes it again, and uncontrolled: nothing on this
          page reads the open state, so a signal here would only duplicate what
          Kobalte already tracks. One fixed label whichever way it sits: the
          rotating chevron and aria-expanded carry the state, so a label that
          also flipped would say it twice. h3 — under the form's own h2 heading
          above. Kobalte unmounts the closed content, but `values()` holds the
          batch size, so collapsing after typing one still submits it. */}
      <Accordion collapsible>
        <AccordionItem value="advanced-options">
          <AccordionTrigger as="h3" class={pageStyles.advancedTrigger}>
            {t('label.advanced-options')}
          </AccordionTrigger>
          <AccordionContent class={pageStyles.advancedContent}>
            <NumberField
              label={t('label.settings-batch-size')}
              helperText={t('label.settings-batch-size-helper')}
              min={1}
              value={values().batchSize}
              onChange={batchSize =>
                setValues(previous => ({ ...previous, batchSize }))
              }
              disabled={locked()}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {/* Spec (OMS-REG-LGN-03.19): informational, never an error — the
          wait is expected and self-healing (D99). Mutually exclusive
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
      {/* The primary action spans the form column (the login page's grouping);
          the screen's secondary controls sit directly beneath it, outside the
          form — see the render below. */}
      <Show
        when={showRetry()}
        fallback={
          <Button
            type="submit"
            class={styles.submitButton}
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
          class={styles.submitButton}
          onClick={() => void retry()}
          disabled={submitting()}
          data-testid="initialise-button"
        >
          {submitting() ? t('button.initialising') : t('button.retry')}
        </Button>
      </Show>
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
        data-testid="initialise-store-name-input"
        value={standaloneValues().storeName}
        onInput={e => {
          const storeName = e.currentTarget.value;
          setStandaloneValues(previous => ({ ...previous, storeName }));
        }}
        error={standaloneFieldErrors().storeName || undefined}
        disabled={standaloneSubmitting()}
      />
      {/* The two credentials are a titled group, not two more loose fields —
          the library FormSection, so the ruled heading (rather than a gap)
          says where the admin user's part of the form starts and its own
          tighter rhythm binds the pair to it. h2: the standalone panel carries
          no heading of its own, so this is a top-level group under the hero's
          h1. */}
      <FormSection title={t('heading.admin-user')}>
        <TextField
          label={t('heading.username')}
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
          data-testid="initialise-admin-password-input"
          value={standaloneValues().password}
          onInput={e => {
            const password = e.currentTarget.value;
            setStandaloneValues(previous => ({ ...previous, password }));
          }}
          error={standaloneFieldErrors().password || undefined}
          disabled={standaloneSubmitting()}
        />
      </FormSection>
      {/* Spec (.26): only the structured union error is shown here — anything
          else already raised the global modal (contract § wire trap). */}
      <Show when={standaloneError()}>
        {err => (
          <Alert severity="error" testId="initialise-standalone-error">
            {err().description}
          </Alert>
        )}
      </Show>
      {/* Plain "Initialise", matching the legacy-sync tab — the active tab
          already says which kind (D100; the current app spells it out) — and
          spanning the form column, as that tab's does. */}
      <Button
        type="submit"
        class={styles.submitButton}
        disabled={standaloneSubmitting()}
        data-testid="initialise-standalone-button"
      >
        {standaloneSubmitting()
          ? t('button.initialising')
          : t('button.initialise')}
      </Button>
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
        <Show when={!compact()}>{versionLine(styles.versionBarHero)}</Show>
      </section>

      <main class={styles.panel}>
        <div class={styles.formArea}>
          {/* The screen's own pieces — the logo above and the secondary
              controls below — sit outside the form(s), so the mode chooser
              swapping one form for another leaves them where they are. */}
          <div class={styles.form}>
            <AppLogo class={styles.logo} />
            <div class={styles.formWithActions}>
              {/* Spec (OMS-REG-LGN-03.23): the mode chooser exists only on a
                  central server in a non-production, non-Android build —
                  everywhere else the legacy-sync form stands alone. */}
              <Show when={showModeChoice()} fallback={<LegacySyncForm />}>
                <Tabs
                  value={mode()}
                  onValueChange={value =>
                    setMode(
                      value === 'standalone' ? 'standalone' : 'legacy-sync'
                    )
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
                  {/* The strip sits inline in the form column, so the panel
                      carries its own gap down to the first field — without it
                      the underline all but touches the label below. */}
                  <TabPanel value="legacy-sync" class={pageStyles.modePanel}>
                    <LegacySyncForm />
                  </TabPanel>
                  <TabPanel value="standalone" class={pageStyles.modePanel}>
                    <StandaloneCentralForm />
                  </TabPanel>
                </Tabs>
              </Show>
              {/* Grouped with the primary button rather than in a page footer —
                  they belong to this setup, not to the page (the login page's
                  grouping, OMS-REG-LGN-03.31). */}
              <div class={styles.formActions}>
                {/* Android only: save the embedded server's log for support
                    before initialisation completes (issue #519.5). Renders
                    nothing on the web — on which the row holds the language
                    selector alone, pinned to its inline end either way. Shaped
                    like the language trigger beside it, the same pairing the
                    login page's old-UI switch has. */}
                <SaveServerLogLink
                  class={styles.secondaryAction}
                  iconClass={styles.secondaryActionIcon}
                  noticeClass={styles.actionNotice}
                />
                {/* Arriving from the desktop discovery page (spec/desktop §
                    server selection, AC-DT16): a not-yet-initialised server
                    may simply be the wrong one — the hand-off's return URL is
                    the way back to choose another. Same affordance as the
                    login page's; renders nothing without the parameter. */}
                <ChangeServerAction testId="initialisation-change-server" />
                <div class={styles.languageAction}>
                  <LanguageSelector
                    language={locale()}
                    onSelect={v => void changeLanguage(v)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <Show when={compact()}>{versionLine(styles.versionBarPanel)}</Show>
      </main>
    </div>
  );
};
