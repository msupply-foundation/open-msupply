import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { ToggleSwitch } from '@/ui/elements/inputs/ToggleSwitch';
import { InfoTooltip } from '@/ui/elements/feedback/InfoTooltip';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { SetSiteMultiDevice } from '../sites.generated';
import { multiDeviceDisabled, showsMultiDeviceReason } from '../sitePairing';

// Multi device (spec/sites/ui-surface.md S2 § pairing actions): a switch, off
// by default, that lets several devices pair as one site sharing a single
// token.
//
// It is a ONE-WAY switch (OMS-FUN-SYC-002.30) — the UI turns it on and never
// off, because the changelog entries a second device skipped are not replayed
// on the way back. The server does NOT enforce that: it accepts the flag in
// both directions (confirmed live), so the one-wayness is this control's rule
// alone.
//
// It is additionally gated on the server-configuration feature flag
// (OMS-FUN-SYC-002.31), which is likewise a CLIENT-side gate only — the server
// accepts the mutation regardless. With the flag unset the switch is present
// but not operable and says why, on the switch itself; the reason is suppressed
// once the switch is on, when it no longer applies.

export interface MultiDeviceSwitchProps {
  siteId: number;
  isMultiDevice: boolean;
  /** Whether `enable_multi_device_site` is set in the server configuration. */
  flagEnabled: boolean;
  /** The site is now multi-device — the switch flips straight away. */
  onSet: () => void;
}

export const MultiDeviceSwitch: Component<MultiDeviceSwitchProps> = props => {
  const [confirming, setConfirming] = createSignal(false);
  const [busy, setBusy] = createSignal(false);

  const run = async () => {
    if (busy()) return; // re-entry guard
    setBusy(true);
    const result = await graphqlFetch(SetSiteMultiDevice, {
      siteId: props.siteId,
      isMultiDevice: true,
    });
    setBusy(false);
    if (result.kind === 'success') props.onSet();
  };

  return (
    <>
      <ToggleSwitch
        label={t('label.multi-device')}
        testId="multi-device-switch"
        checked={props.isMultiDevice}
        disabled={
          multiDeviceDisabled(props.isMultiDevice, props.flagEnabled) || busy()
        }
        // Only the off → on transition is reachable, so the confirmation needs
        // no direction of its own.
        onChange={() => setConfirming(true)}
        labelInfo={
          <Show
            when={showsMultiDeviceReason(
              props.isMultiDevice,
              props.flagEnabled
            )}
          >
            <InfoTooltip
              // ⚠️ This key is MISSING from this repo's ported English
              // catalogue (it exists in the current app's). Added here, in
              // src/intl/locales/en/ only, with the current app's own wording —
              // the gap the spec carries is a translation-pass gap, not a
              // licence to repoint the tooltip at a near-miss key.
              text={t('messages.multi-device-requires-flag')}
              triggerTestId="multi-device-reason"
            />
          </Show>
        }
      />
      <ConfirmDialog
        open={confirming()}
        onClose={() => setConfirming(false)}
        title={t('heading.are-you-sure')}
        message={t('messages.confirm-set-multi-device')}
        onConfirm={() => void run()}
      />
    </>
  );
};
