import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '../api/graphql';
import {
  InitialisationStatus,
  InitialiseSite,
  LatestSyncStatus,
  ManualSync,
  SyncInfoUpdated,
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
import { SyncProgress } from './SyncProgress';
import { TextField } from '../ui/elements/inputs/TextField';
import { PasswordField } from '../ui/elements/inputs/PasswordField';
import { NumberField } from '../ui/elements/inputs/NumberField';
import { Button } from '../ui/elements/buttons/Button';
import { Alert } from '../ui/elements/feedback/Alert';
import { MSupplyGuyLogo } from '../ui/icons';
import { LanguageSelector } from '../ui/layout/AppShell/LanguageSelector';
import {
  DEFAULT_SYNC_INTERVAL_SECONDS,
  SYNC_POLL_INTERVAL_MS,
} from '../config';
import { changeLanguage, locale, t } from '../intl';
import styles from '../ui/styles/LoginInitLayout.module.css';
import pageStyles from './Initialisation.module.css';

export const InitialisationPage: Component<{
  onComplete: () => void;
}> = props => {
  const [values, setValues] = createSignal({
    url: '',
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
  // manualSync) would have nothing to retry — see AC-IN5.
  const [syncStarted, setSyncStarted] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);
  const [syncError, setSyncError] = createSignal<SyncError>();
  const [overview, setOverview] = createSignal<SyncOverview>();

  let disposeWatch: (() => void) | undefined;
  onCleanup(() => disposeWatch?.());

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

  const validate = (): boolean => {
    const current = values();
    const errors = {
      url: current.url.trim() === '' ? t('error.url-required') : '',
      siteName:
        current.siteName.trim() === '' ? t('error.site-name-required') : '',
      password:
        current.password.trim() === '' ? t('error.password-required') : '',
    };
    setFieldErrors(errors);
    return Object.values(errors).every(message => message === '');
  };

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    // Spec: the button is always clickable; validation errors show on click.
    if (!validate()) return;
    setSubmitting(true);
    setSyncError(undefined);
    const result = await graphqlFetch(InitialiseSite, {
      input: {
        url: values().url,
        username: values().siteName,
        password: values().password,
        // Spec: not user-editable — always the default (AC-IN2).
        intervalSeconds: DEFAULT_SYNC_INTERVAL_SECONDS,
        batchSize: values().batchSize,
      },
    });
    // Failures are handled globally; stay in the submitting phase. The
    // expected sync errors below come back as union variants on success.
    if (result.kind !== 'success') return;
    const { initialiseSite } = result.data;
    if (initialiseSite.__typename === 'SyncSettingsNode') {
      setSubmitting(false);
      setSyncStarted(true);
      watchProgress();
    } else {
      // Spec (AC-IN9): initialisation never started, so the button stays
      // Initialise (not Retry) and the fields unlock for correction.
      setSubmitting(false);
      setSyncError({
        variant:
          initialiseSite.__typename === 'SyncErrorV7Node'
            ? initialiseSite.variantV7
            : initialiseSite.variant,
        fullError: initialiseSite.fullError,
      });
    }
  };

  // Spec: on error the button becomes retry, calling the manual sync mutation.
  // Only reachable once syncStarted — inputs stay locked.
  const retry = async () => {
    setSyncError(undefined);
    const result = await graphqlFetch(ManualSync, {});
    // Failures are handled globally; stay in the submitting phase.
    if (result.kind === 'success') watchProgress();
  };

  const showRetry = () => syncStarted() && syncError() != null;
  // Spec: fields lock while the request is in flight, and stay locked for the
  // whole time sync has actually started (including a watched-sync error —
  // that's the Retry case). A sync error BEFORE syncStarted means
  // initialisation never began, so fields unlock for correction (AC-IN5).
  const locked = () => submitting() || syncStarted();
  const busy = () => locked() && syncError() == null;

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
          <form
            class={styles.form}
            aria-label={t('button.initialise')}
            onSubmit={submit}
          >
            <MSupplyGuyLogo class={styles.logo} />
            <TextField
              label={t('label.settings-url')}
              width="full"
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
            <Show when={syncError()}>
              {err => {
                const errorSummary = () => syncErrorSummary(err().variant);
                return (
                  <Alert severity="error">
                    <div>{t(errorSummary().summary)}</div>
                    <details class={pageStyles.moreInfo}>
                      <summary>{t('error.more-info')}</summary>
                      <Show when={errorSummary().hint}>
                        {hint => <p class={pageStyles.hint}>{t(hint())}</p>}
                      </Show>
                      <pre class={pageStyles.errorDetail}>
                        {err().fullError}
                      </pre>
                    </details>
                  </Alert>
                );
              }}
            </Show>
            <Show when={busy()}>
              <SyncProgress overview={overview()} />
            </Show>
            <div class={styles.buttonRow}>
              <Show
                when={showRetry()}
                fallback={
                  <Button type="submit" disabled={busy()}>
                    {busy() ? t('button.initialising') : t('button.initialise')}
                  </Button>
                }
              >
                <Button onClick={() => void retry()}>
                  {t('button.retry')}
                </Button>
              </Show>
            </div>
          </form>
        </div>
        <footer class={styles.panelFooter}>
          <p class={styles.version}>
            <strong>{t('label.app-version')}</strong> {APP_VERSION}
          </p>
          {/* Spec (App version, AC-VN2): absent until the startup pass has
              fetched it — pre-initialisation that also needs a server carrying
              open-msupply#12566. */}
          <Show when={serverVersion()}>
            <p class={styles.version}>
              <strong>{t('label.server-version')}</strong> {serverVersion()}
            </p>
          </Show>
          <LanguageSelector
            language={locale()}
            onSelect={v => void changeLanguage(v)}
          />
        </footer>
      </main>
    </div>
  );
};
