import { createEffect, createResource, createSignal, on, Show } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { syncStatus } from '../../../api/syncStore';
import { ToggleSwitch } from '../../../ui/elements/inputs/ToggleSwitch';
import { InfoTooltip } from '../../../ui/elements/feedback/InfoTooltip';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { t, tPlural } from '../../../intl';
import {
  MaintenanceMode as MaintenanceModeQuery,
  SetMaintenanceMode,
} from './syncSettings.generated';
import { createSaveOnToggle } from './saveOnToggle';

type Failure =
  { kind: 'integration-incomplete'; pending: number } | { kind: 'failed' };

const failureMessage = (failure: Failure): string =>
  failure.kind === 'integration-incomplete'
    ? tPlural('error.maintenance-mode-integration-incomplete', failure.pending)
    : t('error.maintenance-mode');

/*
 * Maintenance mode (issue #840) — central server + Server Admin only (gated by
 * the page; the server enforces both). One switch that holds this server's
 * sync, the sync API and the processors together, and signs out everyone who
 * is not a server administrator, so OMS central can integrate its own sync
 * buffer without the outer transaction. A manual sync from the sync modal is
 * what runs that integration.
 *
 * Turning it off is refused while that buffer still has records to integrate;
 * the count comes back with the refusal and is re-read after every run.
 */
export const MaintenanceMode = (props: {
  /** Called after the switch flips, so the section re-reads the pauses it
   * holds. */
  onChanged: () => void;
  /** Reports whether the mode is on, so the section can hold its pauses. */
  onState: (on: boolean) => void;
}) => {
  const [stateData, { mutate, refetch }] = createResource(async () => {
    const result = await graphqlFetch(MaintenanceModeQuery, {});
    return result.kind === 'success' ? result.data.maintenanceMode : null;
  });
  const state = () => gated(stateData) ?? null;
  const isOn = () => state()?.isOn ?? false;
  createEffect(() => props.onState(isOn()));

  const [failure, setFailure] = createSignal<Failure>();

  // A run that just finished has integrated some or all of the buffer, so a
  // refusal quoting the old count no longer holds: clear it and re-read.
  createEffect(
    on(
      () => syncStatus()?.isSyncing,
      (syncing, wasSyncing) => {
        if (wasSyncing && !syncing) {
          setFailure(undefined);
          void refetch();
        }
      },
      { defer: true }
    )
  );

  // A failed save reverts the switch (saveOnToggle). Every settled save lands
  // in the resource before the flip is released, so it never flickers.
  const { checked, busy, toggle } = createSaveOnToggle(isOn, async on => {
    setFailure(undefined);
    // `background`: this row owns its failure surface rather than the global
    // unexpected-error modal.
    const result = await graphqlFetch(
      SetMaintenanceMode,
      { on },
      { background: true }
    );
    if (result.kind === 'success') {
      const payload = result.data.centralServer.general.setMaintenanceMode;
      if (payload.__typename === 'MaintenanceModeNode') {
        mutate(payload);
        props.onChanged();
      } else {
        setFailure({
          kind: 'integration-incomplete',
          pending: payload.error.pendingIntegrationRecords,
        });
        await refetch();
      }
    } else if (result.kind !== 'unauthenticated') {
      setFailure({ kind: 'failed' });
    }
  });

  return (
    <Stack gap="sm">
      <ToggleSwitch
        label={t('label.maintenance-mode')}
        checked={checked()}
        onChange={on => void toggle(on)}
        disabled={busy() || stateData.state !== 'ready' || state() == null}
        variant="caution"
        labelInfo={
          <InfoTooltip
            text={t('label.maintenance-mode-info')}
            label={t('label.maintenance-mode')}
            triggerTestId="sync-settings-maintenance-mode-info"
          />
        }
        testId="sync-settings-maintenance-mode"
      />
      <Show when={isOn()}>
        <Alert severity="warning" testId="sync-settings-maintenance-mode-on">
          <div>{t('messages.maintenance-mode-on')}</div>
          <Show when={state()?.pendingIntegrationRecords}>
            {pending => (
              <div>
                {tPlural('messages.maintenance-mode-pending', pending())}
              </div>
            )}
          </Show>
        </Alert>
      </Show>
      <Show when={failure()}>
        {f => (
          <Alert severity="error" testId="sync-settings-maintenance-mode-error">
            {failureMessage(f())}
          </Alert>
        )}
      </Show>
    </Stack>
  );
};
