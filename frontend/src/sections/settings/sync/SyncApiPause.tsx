import { createResource, createSignal, Show } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { ToggleSwitch } from '../../../ui/elements/inputs/ToggleSwitch';
import { InfoTooltip } from '../../../ui/elements/feedback/InfoTooltip';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { t } from '../../../intl';
import { IsSyncApiPaused, SetSyncApiPaused } from './syncSettings.generated';

/*
 * Pause sync API (issue #717) — central server + Server Admin only (gated
 * by the page; the server enforces both). While on, central refuses remote
 * sites' sync data requests, so support can run maintenance without taking the
 * UI down. Saves immediately on toggle, like the other settings switches. It
 * sits directly under this server's own Pause sync switch, above the sync form,
 * and is independent of both.
 */
export const SyncApiPause = () => {
  // Non-suspending read — lives inside the already-open settings page
  // (kdd/solid-reactivity-pitfalls § no remounts).
  const [pausedData, { mutate }] = createResource(async () => {
    const result = await graphqlFetch(IsSyncApiPaused, {});
    return result.kind === 'success' ? result.data.isSyncApiPaused : false;
  });
  const paused = () => gated(pausedData) ?? false;

  const [busy, setBusy] = createSignal(false);
  const [failed, setFailed] = createSignal(false);

  const toggle = async (checked: boolean) => {
    setBusy(true);
    setFailed(false);
    // `background`: this row owns its failure surface rather than the global
    // unexpected-error modal.
    const result = await graphqlFetch(
      SetSyncApiPaused,
      { paused: checked },
      { background: true }
    );
    if (result.kind === 'success') {
      mutate(result.data.centralServer.general.setSyncApiPaused.isPaused);
    } else if (result.kind !== 'unauthenticated') {
      setFailed(true);
    }
    setBusy(false);
  };

  return (
    <Stack gap="sm">
      <ToggleSwitch
        label={t('label.pause-sync-api')}
        checked={paused()}
        onChange={checked => void toggle(checked)}
        disabled={busy() || pausedData.state !== 'ready'}
        variant="caution"
        labelInfo={
          <InfoTooltip
            text={t('label.pause-sync-api-info')}
            label={t('label.pause-sync-api')}
            triggerTestId="sync-settings-pause-sync-api-info"
          />
        }
        testId="sync-settings-pause-sync-api"
      />
      <Show when={paused()}>
        <Alert severity="warning">{t('messages.sync-api-paused')}</Alert>
      </Show>
      <Show when={failed()}>
        <Alert severity="error">{t('error.pause-sync-api')}</Alert>
      </Show>
    </Stack>
  );
};
