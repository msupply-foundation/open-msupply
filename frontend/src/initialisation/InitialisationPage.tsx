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
import { TextField } from '../ui/elements/inputs/TextField';
import { Button } from '../ui/elements/buttons/Button';
import { Alert } from '../ui/elements/feedback/Alert';
import {
  DEFAULT_SYNC_INTERVAL_SECONDS,
  SYNC_POLL_INTERVAL_MS,
} from '../config';
import { t } from '../intl';
import styles from '../ui/styles/shared.module.css';

export const InitialisationPage: Component<{
  onComplete: () => void;
}> = props => {
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
      siteName:
        current.siteName.trim() === '' ? t('init.site-name-required') : '',
      password:
        current.password.trim() === '' ? t('init.password-required') : '',
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
    // Failures are handled globally; stay in the initialising phase. The
    // expected sync errors below come back as union variants on success.
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
        <h1>{t('initialise.heading')}</h1>
        <TextField
          label={t('label.settings-url')}
          width="full"
          value={values().url}
          onInput={e => {
            const url = e.currentTarget.value;
            setValues(previous => ({ ...previous, url }));
          }}
          error={fieldErrors().url || undefined}
          disabled={initialising()}
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
          disabled={initialising()}
        />
        <TextField
          label={t('heading.password')}
          width="full"
          type="password"
          value={values().password}
          onInput={e => {
            const password = e.currentTarget.value;
            setValues(previous => ({ ...previous, password }));
          }}
          error={fieldErrors().password || undefined}
          disabled={initialising()}
        />
        <TextField
          label={t('label.settings-interval')}
          width="full"
          inputmode="numeric"
          value={values().intervalSeconds}
          onInput={e => {
            const intervalSeconds = e.currentTarget.value;
            setValues(previous => ({ ...previous, intervalSeconds }));
          }}
          error={fieldErrors().intervalSeconds || undefined}
          disabled={initialising()}
        />
        <Show when={syncError()}>
          <Alert severity="error">{syncError()}</Alert>
        </Show>
        <Show when={busy()}>
          <SyncProgress overview={overview()} />
        </Show>
        <Show
          when={showRetry()}
          fallback={
            <Button type="submit" disabled={busy()}>
              {busy() ? t('init.submitting') : t('button.initialise')}
            </Button>
          }
        >
          <Button onClick={() => void retry()}>{t('button.retry')}</Button>
        </Show>
      </form>
    </div>
  );
};
