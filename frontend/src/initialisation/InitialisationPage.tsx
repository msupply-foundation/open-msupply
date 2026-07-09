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
import { toSyncOverview, type SyncOverview } from './syncStatus';
import { SyncProgress } from './SyncProgress';
import { FormField } from '../ui/elements/inputs/FormField';
import { DEFAULT_SYNC_INTERVAL_SECONDS, SYNC_POLL_INTERVAL_MS } from '../config';
import { t } from '../intl';
import styles from '../ui/styles/shared.module.css';

export const InitialisationPage: Component<{ onComplete: () => void }> = props => {
  const [values, setValues] = createSignal({
    url: '',
    siteName: '',
    password: '',
    intervalSeconds: String(DEFAULT_SYNC_INTERVAL_SECONDS),
  });
  const [fieldErrors, setFieldErrors] = createSignal({
    url: '',
    siteName: '',
    password: '',
    intervalSeconds: '',
  });
  const [initialising, setInitialising] = createSignal(false);
  const [syncError, setSyncError] = createSignal<string>();
  const [overview, setOverview] = createSignal<SyncOverview>();

  let disposeWatch: (() => void) | undefined;
  onCleanup(() => disposeWatch?.());

  const handleStatus = (status: SyncStatusFragment | null | undefined) => {
    const next = toSyncOverview(status);
    if (!next) return;
    setOverview(next);
    if (next.errorMessage != null) {
      setSyncError(next.errorMessage);
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

  // Spec: try the sync status subscription first; fall back to polling.
  const watchProgress = () => {
    disposeWatch?.();
    let poller: number | undefined;
    const disposeSubscription = subscribe(SyncInfoUpdated, undefined, {
      onData: data => handleStatus(data.syncInfoUpdated.syncStatus),
      onFailure: () => {
        poller = window.setInterval(() => {
          void graphqlFetch(LatestSyncStatus, {}).then(result => {
            // Transient poll failures are ignored; the next tick retries.
            if (result.kind === 'success') handleStatus(result.data.latestSyncStatus);
          });
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
      // Already initialising (e.g. page reload mid-initialisation): lock inputs,
      // show the known site name, watch progress.
      const { initialisationStatus } = result.data;
      if (initialisationStatus.status === 'INITIALISING') {
        setValues(previous => ({ ...previous, siteName: initialisationStatus.siteName ?? '' }));
        setInitialising(true);
        watchProgress();
      }
    });
  });

  const validate = (): boolean => {
    const current = values();
    const interval = Number(current.intervalSeconds);
    const errors = {
      url: current.url.trim() === '' ? t('init.url-required') : '',
      siteName: current.siteName.trim() === '' ? t('init.site-name-required') : '',
      password: current.password.trim() === '' ? t('init.password-required') : '',
      intervalSeconds:
        current.intervalSeconds.trim() === ''
          ? t('init.interval-required')
          : !Number.isInteger(interval) || interval <= 0
            ? t('init.interval-invalid')
            : '',
    };
    setFieldErrors(errors);
    return Object.values(errors).every(message => message === '');
  };

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    // Spec: the button is always clickable; validation errors show on click.
    if (!validate()) return;
    setInitialising(true);
    setSyncError(undefined);
    const result = await graphqlFetch(InitialiseSite, {
      input: {
        url: values().url,
        username: values().siteName,
        password: values().password,
        intervalSeconds: Number(values().intervalSeconds),
      },
    });
    // Failures are handled globally; stay in the initialising phase. The expected
    // sync errors below come back as union variants on success.
    if (result.kind !== 'success') return;
    const { initialiseSite } = result.data;
    if (initialiseSite.__typename === 'SyncSettingsNode') {
      watchProgress();
    } else {
      setSyncError(initialiseSite.fullError);
    }
  };

  // Spec: on error the button becomes retry, calling the manual sync mutation.
  // Inputs stay locked.
  const retry = async () => {
    setSyncError(undefined);
    const result = await graphqlFetch(ManualSync, {});
    // Failures are handled globally; stay in the initialising phase.
    if (result.kind === 'success') watchProgress();
  };

  const showRetry = () => initialising() && syncError() != null;
  const busy = () => initialising() && syncError() == null;

  return (
    <div class={styles.page}>
      <form class={styles.card} onSubmit={submit}>
        <h1>{t('init.title')}</h1>
        <FormField
          id="init-url"
          label={t('init.url')}
          value={values().url}
          onInput={url => setValues(previous => ({ ...previous, url }))}
          error={fieldErrors().url}
          disabled={initialising()}
        />
        <FormField
          id="init-site-name"
          label={t('init.site-name')}
          value={values().siteName}
          onInput={siteName => setValues(previous => ({ ...previous, siteName }))}
          error={fieldErrors().siteName}
          disabled={initialising()}
        />
        <FormField
          id="init-password"
          label={t('init.password')}
          type="password"
          value={values().password}
          onInput={password => setValues(previous => ({ ...previous, password }))}
          error={fieldErrors().password}
          disabled={initialising()}
        />
        <FormField
          id="init-interval-seconds"
          label={t('init.interval')}
          value={values().intervalSeconds}
          onInput={intervalSeconds => setValues(previous => ({ ...previous, intervalSeconds }))}
          error={fieldErrors().intervalSeconds}
          disabled={initialising()}
        />
        <Show when={syncError()}>
          <p class={styles.errorText}>{syncError()}</p>
        </Show>
        <Show when={busy()}>
          <SyncProgress overview={overview()} />
        </Show>
        <Show
          when={showRetry()}
          fallback={
            <button class={styles.button} type="submit" disabled={busy()}>
              {busy() ? t('init.submitting') : t('init.submit')}
            </button>
          }
        >
          <button class={styles.button} type="button" onClick={() => void retry()}>
            {t('init.retry')}
          </button>
        </Show>
      </form>
    </div>
  );
};
