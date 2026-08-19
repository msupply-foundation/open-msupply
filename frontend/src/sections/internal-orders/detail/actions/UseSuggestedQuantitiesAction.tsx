import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import {
  CancelButton,
  OkButton,
} from '../../../../ui/elements/buttons/StandardButtons';
import { ZapIcon } from '../../../../ui/icons';
import { useSuggestedQuantities } from '../internalOrderUpdate';

// The "Use suggested quantities" app-bar action (spec S3 § page actions → S6,
// AC-Q1/Q2): fills every zero-requested line with its suggestion, behind a
// confirmation — the whole order in one call, on program orders too. Disabled
// on read-only orders (AC-Q2 — the server rejects it anyway, but the gate reads
// as unavailable rather than failing on confirm). Modelled on
// DeleteInternalOrderAction; a successful apply hands control to the view
// (onApplied), which refetches the line table.
type Phase = 'confirm' | 'applying' | 'error';

export const UseSuggestedQuantitiesAction: Component<{
  storeId: string;
  orderId: string;
  /** Draft-and-enabled gate — disables the button off Draft (AC-Q2). */
  disabled: boolean;
  /** Applied — the view refetches the line table (the new quantities). */
  onApplied: () => void;
}> = props => {
  const [open, setOpen] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const close = () => {
    setOpen(false);
    setPhase('confirm');
    setErrorMessage(undefined);
  };

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('applying');
    const result = await useSuggestedQuantities(props.storeId, props.orderId);
    if (result.kind === 'done') {
      props.onApplied();
      close();
      return;
    }
    if (result.kind === 'error') {
      setErrorMessage(result.message);
      setPhase('error');
      return;
    }
    // transport/unexpected → global modal already surfaced it; reset.
    setPhase('confirm');
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={<ZapIcon />}
        // Icon-only on a narrow viewport, so the header's action cluster fits
        // beside the breadcrumb instead of taking a row of its own.
        collapsible="narrow"
        title={t('button.requested-to-suggested')}
        disabled={props.disabled}
        data-testid="use-suggested-quantities-button"
        onClick={() => setOpen(true)}
      >
        {t('button.requested-to-suggested')}
      </Button>
      <Show when={open()}>
        <Dialog
          open
          dismissable={phase() !== 'applying'}
          onClose={close}
          icon={<ZapIcon />}
          testId="confirmation-modal"
          title={t('heading.requested-to-suggested')}
          description={
            <Switch fallback={t('messages.requested-to-suggested')}>
              <Match when={phase() === 'error'}>
                <Alert severity="error">{errorMessage()}</Alert>
              </Match>
            </Switch>
          }
          actions={
            <Switch
              fallback={
                <>
                  <Show when={phase() === 'confirm'}>
                    <CancelButton onClick={close} />
                  </Show>
                  <OkButton
                    data-testid="confirmation-modal-ok"
                    loading={phase() === 'applying'}
                    onClick={() => void run()}
                  />
                </>
              }
            >
              <Match when={phase() === 'error'}>
                <Button variant="secondary" confirms="plain" onClick={close}>
                  {t('button.close')}
                </Button>
              </Match>
            </Switch>
          }
        />
      </Show>
    </>
  );
};
