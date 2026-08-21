import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Button } from '../../../ui/elements/buttons/Button';
import { SplitButton } from '../../../ui/elements/buttons/SplitButton';
import { createAction } from '../../../ui/utils/keyActions';
import { ALT_V } from '../../../ui/utils/shortcuts';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { StatusIndicator } from '../../../ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { XCircleIcon } from '../../../ui/icons';
import {
  asPrescriptionStatus,
  hasDispensedLines,
  isReadOnly,
  nextStatuses,
  statusIndex,
  statusSteps,
  zeroQuantityLineCount,
  STATUS_LABEL_KEYS,
  type ForwardStatus,
} from '../prescriptionStatus';
import { savePrescription, type UpdateInput } from './prescriptionUpdate';
import { PaymentsModal } from './PaymentsModal';
import type { PrescriptionFieldsFragment } from './prescriptionDetail.generated';

// The detail status footer (spec/prescriptions/ui-surface.md S3 § status
// footer): the lifecycle crumbs (CANCELLED only once cancelled — AC-V2),
// Close, and the status-change split button — primary "Confirm ‹next›",
// options the allowed FORWARD transitions only (D40), hidden entirely once
// read-only (D39). One client pre-flight only: no dispensed lines → a
// blocking notice, no server call (AC-S6, the captured server gap). The
// confirmation warns when zero-quantity rows will be removed (AC-S5); with
// insurance providers configured and a charged total the payment window
// opens instead (AC-Y1). A typed rejection surfaces in the same dialog as a
// blocking notice — never a toast (S7, D21).

export interface PrescriptionStatusFooterProps {
  storeId: string;
  node: PrescriptionFieldsFragment;
  /** Insurance providers exist for the store (the payment-window gate). */
  hasInsuranceProviders: boolean;
  /** The status change saved — merge the returned node in place. */
  onSaved: (node: PrescriptionFieldsFragment) => void;
}

export const PrescriptionStatusFooter: Component<
  PrescriptionStatusFooterProps
> = props => {
  // The confirm dialog's target status (undefined = closed) and its phase;
  // the payment window and the no-lines notice are their own gates.
  const [pendingStatus, setPendingStatus] = createSignal<ForwardStatus>();
  const [working, setWorking] = createSignal(false);
  const [rejection, setRejection] = createSignal<string>();
  const [noLinesOpen, setNoLinesOpen] = createSignal(false);
  const [paymentStatus, setPaymentStatus] = createSignal<ForwardStatus>();

  const status = () => asPrescriptionStatus(props.node.status);
  const options = () =>
    nextStatuses(status()).map(next => ({
      value: next,
      label: t('button.save-and-confirm-status', {
        status: t(STATUS_LABEL_KEYS[next]),
      }),
    }));
  // The split button's selection, DERIVED against the current offer so it
  // can never go stale: after auto-pick moves NEW → PICKED (a refetch, not a
  // click), a remembered 'PICKED' choice falls back to the first offered
  // option instead of naming a transition that no longer exists.
  const [chosen, setChosen] = createSignal<ForwardStatus>();
  const selectedStatus = (): ForwardStatus | undefined => {
    const candidate = chosen();
    const offered = nextStatuses(status());
    return candidate && offered.includes(candidate) ? candidate : offered[0];
  };

  const zeroCount = () => zeroQuantityLineCount(props.node.lines.nodes);

  /*
   * Alt+V — update status (spec/keyboard KB-R1's binding table, ui-surface
   * S2). Declared HERE, not in the detail view, because this component owns
   * the control and the selection the binding acts on: the split button's
   * currently selected forward transition. That is the same "one creation site
   * per binding, inside the thing that owns it" shape as createSidePanelOpen's
   * Alt+M (kdd/keyboard-layer decision 4).
   *
   * A SPECIFIC action (KB-R2's contrast), so gating on this screen is correct —
   * the prescription detail is the only place it exists. Registration lives
   * exactly as long as this footer, and the footer itself is <Show>-gated away
   * behind the bulk-selection bar, so the key stops answering when the control
   * does with no further code.
   */
  createAction({
    name: 'button.update-status',
    shortcut: ALT_V,
    run: () => {
      const next = selectedStatus();
      if (next) openConfirm(next);
    },
    // Same inertness as the control: hidden once read-only (D39), and nothing
    // to confirm when no forward transition is offered.
    disabled: () => isReadOnly(status()) || !selectedStatus(),
  });

  const closeDialogs = () => {
    setPendingStatus(undefined);
    setRejection(undefined);
    setPaymentStatus(undefined);
  };

  const openConfirm = (next: ForwardStatus) => {
    // The one sanctioned pre-flight (AC-S6): nothing dispensed — carrier-only
    // counts as nothing — blocks with a notice and no server call.
    if (!hasDispensedLines(props.node.lines.nodes)) return setNoLinesOpen(true);
    // The payment window replaces the plain confirmation when the store has
    // providers and the prescription carries a charge (AC-Y1).
    if (props.hasInsuranceProviders && props.node.pricing.totalAfterTax > 0)
      return setPaymentStatus(next);
    setPendingStatus(next);
  };

  const run = async (
    next: ForwardStatus,
    extra?: Partial<UpdateInput>,
    // The payment window's plugin after-save step (spec/plugins/rules.md § form
    // participation): awaited AFTER the status change has succeeded and before
    // the save is reported complete. It resolves to a message when a plugin's
    // own write failed — the window stays open showing it, because the
    // prescription IS saved but the plugin's record is not, and that must not
    // vanish silently.
    afterSave?: (context: { recordId: string }) => Promise<string | undefined>
  ) => {
    setWorking(true);
    // A retry must not show the previous attempt's verdict.
    setRejection(undefined);
    const outcome = await savePrescription(props.storeId, {
      id: props.node.id,
      status: next,
      ...extra,
    });
    if (outcome.kind === 'saved') {
      const failure = await afterSave?.({ recordId: props.node.id });
      setWorking(false);
      if (failure) {
        // The payment window surfaces the failure itself; leave it open and
        // still merge the saved node, since the status change did land.
        props.onSaved(outcome.node);
        return;
      }
      closeDialogs();
      props.onSaved(outcome.node);
      return;
    }
    setWorking(false);
    if (outcome.kind === 'rejected') {
      // The server's verdict shows as a blocking notice in the surface that
      // initiated the save — never a toast (D21). When that surface is the
      // PAYMENT WINDOW it stays open and shows the notice there: it now carries
      // a plugin contribution's own draft (amount tendered, payment method), so
      // swapping it for the plain confirmation would throw away the user's input
      // over a server error they can fix.
      setRejection(outcome.description);
      if (!paymentStatus()) setPendingStatus(next);
      return;
    }
    closeDialogs(); // transport — the global modal has it
  };

  return (
    <ContentFooter>
      <StatusIndicator
        steps={statusSteps(props.node)}
        current={statusIndex(status())}
      />

      <ContentFooterActions>
        {/* No Close here (D103): leaving the prescription is the breadcrumb's
            job, in the app bar, where every other screen puts it. */}
        {/* Hidden once read-only — a permanently dead control (D39). */}
        <Show when={!isReadOnly(status())}>
          <SplitButton
            options={options()}
            value={selectedStatus()}
            onValueChange={value => {
              // Resolve the option string back to the typed status it was
              // built from (no cast — kdd/type-safety).
              const next = nextStatuses(status()).find(s => s === value);
              if (next) setChosen(next);
            }}
            menuSelectsOnly
            testId="status-change-button"
            // Alt+V is registered above; this is the control that advertises it
            // (ui-surface S2).
            shortcut={ALT_V}
            onAction={value => {
              const next = nextStatuses(status()).find(s => s === value);
              if (next) openConfirm(next);
            }}
          />
        </Show>
      </ContentFooterActions>

      {/* The no-lines blocking notice (AC-S6) — a notice, never a toast. */}
      <Dialog
        open={noLinesOpen()}
        onClose={() => setNoLinesOpen(false)}
        title={t('heading.are-you-sure')}
        testId="confirmation-modal"
        description={<Alert severity="info">{t('messages.no-lines')}</Alert>}
        actions={
          <Button
            confirms="plain"
            data-testid="dialog-button-ok"
            onClick={() => setNoLinesOpen(false)}
          >
            {t('button.ok')}
          </Button>
        }
      />

      {/* The status confirmation — zero-quantity removal warned (AC-S5); a
          typed rejection swaps the message for the blocking notice. */}
      <Show when={pendingStatus()}>
        {next => (
          <Dialog
            open
            dismissable={!working()}
            onClose={closeDialogs}
            title={t('heading.are-you-sure')}
            testId="confirmation-modal"
            description={
              <Show
                when={rejection()}
                fallback={
                  zeroCount() > 0
                    ? t('messages.confirm-zero-quantity-status')
                    : t('messages.confirm-status-as', {
                        status: t(STATUS_LABEL_KEYS[next()]),
                      })
                }
              >
                {description => <Alert severity="error">{description()}</Alert>}
              </Show>
            }
            actions={
              <Show
                when={!rejection()}
                fallback={
                  <Button
                    confirms="plain"
                    data-testid="dialog-button-ok"
                    onClick={closeDialogs}
                  >
                    {t('button.close')}
                  </Button>
                }
              >
                <Show when={!working()}>
                  <Button
                    variant="secondary"
                    icon={<XCircleIcon />}
                    confirms="cancel"
                    onClick={closeDialogs}
                  >
                    {t('button.cancel')}
                  </Button>
                </Show>
                <Button
                  confirms="plain"
                  data-testid="confirmation-modal-ok"
                  loading={working()}
                  onClick={() => void run(next())}
                >
                  {t('button.ok')}
                </Button>
              </Show>
            }
          />
        )}
      </Show>

      {/* The payment window (AC-Y1/Y2) — confirming saves policy + discounts
          together with the status change. */}
      <Show when={paymentStatus()}>
        {next => (
          <PaymentsModal
            storeId={props.storeId}
            node={props.node}
            working={working()}
            rejection={rejection()}
            onClose={closeDialogs}
            onConfirm={(extra, afterSave) => void run(next(), extra, afterSave)}
          />
        )}
      </Show>
    </ContentFooter>
  );
};
