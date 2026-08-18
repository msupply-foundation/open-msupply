import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton, OkButton } from '@/ui/elements/buttons/StandardButtons';
import { ZapIcon } from '@/ui/icons';
import { supplyRequestedQuantities } from '../requisitionUpdate';

// The "Supply requested" app-bar action (spec S2 § page actions → rules §
// auto-populating; OMS-REG-DIST-05 .9/.30): fills every line's supply quantity
// with its requested quantity in one call, behind a confirmation. On a
// requisition carrying an approval status the server writes the APPROVED
// quantity instead, and the whole surface — button, heading, message —
// presents itself as supplying to approved (.30). Disabled while the
// requisition is not editable (the server rejects it anyway — .31 — but the
// gate reads as unavailable rather than failing on confirm). Modelled on the
// internal-order UseSuggestedQuantitiesAction; a successful apply hands
// control to the view (onApplied), which refetches the line table.
type Phase = 'confirm' | 'applying' | 'error';

export const SupplyRequestedAction: Component<{
  storeId: string;
  requisitionId: string;
  /**
   * The requisition carries an approval status — the server will write the
   * approved quantities, so the surface says so (rules § auto-populating).
   */
  toApproved: boolean;
  /** The shared editability gate — disables the button when read-only. */
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
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('applying');
    const result = await supplyRequestedQuantities(
      props.storeId,
      props.requisitionId
    );
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
    // transport/unexpected → the global error modal already surfaced it; reset.
    setPhase('confirm');
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={<ZapIcon />}
        // Icon-only on a narrow viewport, so the header's action cluster fits
        // beside the breadcrumb instead of taking a row of its own. The
        // tooltip tracks the label, which names the quantity supplied to.
        collapsible="narrow"
        title={
          props.toApproved
            ? t('button.supply-to-approved')
            : t('button.supply-to-requested')
        }
        disabled={props.disabled}
        data-testid="supply-to-requested-button"
        onClick={() => setOpen(true)}
      >
        {props.toApproved
          ? t('button.supply-to-approved')
          : t('button.supply-to-requested')}
      </Button>
      <Show when={open()}>
        <Dialog
          open
          dismissable={phase() !== 'applying'}
          onClose={close}
          icon={<ZapIcon />}
          testId="confirmation-modal"
          title={
            props.toApproved
              ? t('heading.supply-to-approved')
              : t('heading.supply-to-requested')
          }
          description={
            <Switch
              fallback={
                props.toApproved
                  ? t('messages.supply-to-approved')
                  : t('messages.supply-to-requested')
              }
            >
              <Match when={phase() === 'error'}>
                <Alert severity="error">{errorMessage()}</Alert>
              </Match>
            </Switch>
          }
          actions={
            <Switch
              fallback={
                // confirm / applying: Cancel (hidden while applying) + the
                // loading OK (D55 — the standard icon-less pair).
                <>
                  <Show when={phase() === 'confirm'}>
                    <CancelButton
                      data-testid="dialog-button-cancel"
                      onClick={close}
                    />
                  </Show>
                  <OkButton
                    data-testid="confirmation-modal-ok"
                    loading={phase() === 'applying'}
                    onClick={() => void run()}
                  />
                </>
              }
            >
              {/* Error: nothing to submit — a single Close. */}
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
