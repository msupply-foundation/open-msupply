import { createResource, createSignal, Show } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { ToggleSwitch } from '../../../ui/elements/inputs/ToggleSwitch';
import { InfoTooltip } from '../../../ui/elements/feedback/InfoTooltip';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { t, type LocaleKey } from '../../../intl';
import {
  AreProcessorsPaused,
  IsSyncApiPaused,
  SetProcessorsPaused,
  SetSyncApiPaused,
} from './syncSettings.generated';

type CentralPauseProps = {
  /** Bumped by the section when maintenance mode flips every pause at once, so
   * the switch re-reads its stored state. */
  version: () => number;
  /** Maintenance mode holds this pause; it is released with the mode. */
  disabled: boolean;
};

/*
 * A central-only pause switch (spec/settings/contract.md § Synchronisation) —
 * central server + Server Admin only (gated by the page; the server enforces
 * both). Saves immediately on toggle, like the other settings switches, and
 * owns its failure surface. Independent of the sync form and of this server's
 * own Pause sync switch.
 */
const CentralPauseSwitch = (
  props: CentralPauseProps & {
    read: () => Promise<boolean | undefined>;
    /** The stored state, 'failed', or undefined when the session ended (the
     * global unauthenticated handling owns that case). */
    write: (paused: boolean) => Promise<boolean | 'failed' | undefined>;
    label: LocaleKey;
    info: LocaleKey;
    pausedMessage: LocaleKey;
    error: LocaleKey;
    testId: string;
  }
) => {
  // Non-suspending read — lives inside the already-open settings page
  // (kdd/solid-reactivity-pitfalls § no remounts).
  const [pausedData, { mutate }] = createResource(
    () => props.version(),
    // `read` is one of the module-level fetchers below, fixed per switch; the
    // re-read is driven by `version`, not by the fetcher changing.
    // eslint-disable-next-line solid/reactivity
    () => props.read().then(paused => paused ?? false)
  );
  const paused = () => gated(pausedData) ?? false;

  const [busy, setBusy] = createSignal(false);
  const [failed, setFailed] = createSignal(false);

  const toggle = async (checked: boolean) => {
    setBusy(true);
    setFailed(false);
    const stored = await props.write(checked);
    if (stored === 'failed') setFailed(true);
    else if (stored !== undefined) mutate(stored);
    setBusy(false);
  };

  return (
    <Stack gap="sm">
      <ToggleSwitch
        label={t(props.label)}
        checked={paused()}
        onChange={checked => void toggle(checked)}
        disabled={busy() || props.disabled || pausedData.state !== 'ready'}
        variant="caution"
        labelInfo={
          <InfoTooltip
            text={t(props.info)}
            label={t(props.label)}
            triggerTestId={`${props.testId}-info`}
          />
        }
        testId={props.testId}
      />
      <Show when={paused() && !props.disabled}>
        <Alert severity="warning">{t(props.pausedMessage)}</Alert>
      </Show>
      <Show when={failed()}>
        <Alert severity="error">{t(props.error)}</Alert>
      </Show>
    </Stack>
  );
};

// `background` on the writes: the row owns its failure surface rather than the
// global unexpected-error modal. An unauthenticated result is handled globally
// (the session ended), so it is not reported as a failed save here either.
const writeFailed = (kind: string): 'failed' | undefined =>
  kind === 'unauthenticated' ? undefined : 'failed';

const readSyncApiPaused = async () => {
  const result = await graphqlFetch(IsSyncApiPaused, {});
  return result.kind === 'success' ? result.data.isSyncApiPaused : false;
};

const writeSyncApiPaused = async (paused: boolean) => {
  const result = await graphqlFetch(
    SetSyncApiPaused,
    { paused },
    { background: true }
  );
  return result.kind === 'success'
    ? result.data.centralServer.general.setSyncApiPaused.isPaused
    : writeFailed(result.kind);
};

const readProcessorsPaused = async () => {
  const result = await graphqlFetch(AreProcessorsPaused, {});
  return result.kind === 'success' ? result.data.areProcessorsPaused : false;
};

const writeProcessorsPaused = async (paused: boolean) => {
  const result = await graphqlFetch(
    SetProcessorsPaused,
    { paused },
    { background: true }
  );
  return result.kind === 'success'
    ? result.data.centralServer.general.setProcessorsPaused.isPaused
    : writeFailed(result.kind);
};

/* Pause sync API (issue #717): while on, central refuses remote sites' sync
 * data requests, so support can run maintenance without taking the UI down. */
export const SyncApiPause = (props: CentralPauseProps) => (
  <CentralPauseSwitch
    {...props}
    read={readSyncApiPaused}
    write={writeSyncApiPaused}
    label="label.pause-sync-api"
    info="label.pause-sync-api-info"
    pausedMessage="messages.sync-api-paused"
    error="error.pause-sync-api"
    testId="sync-settings-pause-sync-api"
  />
);

/* Pause processors (issue #840): while on, central's transfer and general
 * processors drop their triggers; resuming runs each once to catch up. */
export const ProcessorsPause = (props: CentralPauseProps) => (
  <CentralPauseSwitch
    {...props}
    read={readProcessorsPaused}
    write={writeProcessorsPaused}
    label="label.pause-processors"
    info="label.pause-processors-info"
    pausedMessage="messages.processors-paused"
    error="error.pause-processors"
    testId="sync-settings-pause-processors"
  />
);
