import { createResource, createSignal, Show } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { pollSyncStatus } from '../../../api/syncStore';
import { ToggleSwitch } from '../../../ui/elements/inputs/ToggleSwitch';
import { InfoTooltip } from '../../../ui/elements/feedback/InfoTooltip';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { t } from '../../../intl';
import { IsSyncApiPaused, SetSyncApiPaused } from './syncSettings.generated';
import { createSaveOnToggle } from './saveOnToggle';

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
  const stored = () => gated(pausedData) ?? false;

  const [failed, setFailed] = createSignal(false);

  // A failed save reverts the switch (saveOnToggle); the response lands in
  // the resource before the flip is released, so it never flickers.
  const { checked, busy, toggle } = createSaveOnToggle(stored, async next => {
    setFailed(false);
    // `background`: this row owns its failure surface rather than the global
    // unexpected-error modal.
    const result = await graphqlFetch(
      SetSyncApiPaused,
      { paused: next },
      { background: true }
    );
    if (result.kind === 'success') {
      mutate(result.data.centralServer.general.setSyncApiPaused.isPaused);
      // So this session's sync modal shows it at once; other sessions get it
      // from the live frame the server emits (as the Pause sync switch).
      void pollSyncStatus();
    } else if (result.kind !== 'unauthenticated') {
      setFailed(true);
    }
  });

  return (
    <Stack gap="sm">
      <ToggleSwitch
        label={t('label.pause-sync-api')}
        checked={checked()}
        onChange={next => void toggle(next)}
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
      {/* The saved state, not the in-flight flip: the warning appears only
          once central is actually refusing remotes. */}
      <Show when={stored()}>
        <Alert severity="warning">{t('messages.sync-api-paused')}</Alert>
      </Show>
      <Show when={failed()}>
        <Alert severity="error">{t('error.pause-sync-api')}</Alert>
      </Show>
    </Stack>
  );
};
