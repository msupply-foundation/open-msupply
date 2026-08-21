import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
} from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { ErrorDetails } from '../../../../ui/elements/feedback/ErrorDetails';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../../ui/elements/buttons/StandardButtons';
import { TrashIcon } from '../../../../ui/icons';
import { DeleteInboundShipments } from '../inboundShipments.generated';
import { deleteRejection } from '@/domain/invoice';

export interface DeleteInboundShipmentsActionProps {
  storeId: string;
  selectedIds: () => string[];
  /**
   * Whether the selection includes a shipment that has already introduced stock
   * (anything past New) — the confirmation says so, because that stock goes
   * with it.
   */
  removesStock: () => boolean;
  onDeleted: () => void;
}

// The inbound-shipments-list bulk delete (spec AC-L3): footer button + a
// confirm → deleting → error dialog. Mirrors DeleteStocktakesAction. The server
// is the source of truth and the action is SUBMITTED rather than pre-screened —
// no client-side copy of the server's delete window, and the button is never
// disabled because the selection "might" contain an undeletable row
// (spec/ui-standards/validation.md § actions; issue #1134). The batch is atomic
// (AC-BA1): if any row can't be deleted the whole batch fails and nothing is
// removed, so on error we show the server's reason (a per-line lock can surface
// here too, per rules → deletion) — which is strictly more informative than the
// old blanket "Only New shipments can be deleted" hover text.
//
// Deleting a Delivered/Received shipment REVERSES the receipt: the server
// cascades to the lines and the stock they created, and refuses per-line the
// moment any of that stock has been issued, reserved, counted in a stocktake or
// arrived by transfer (BatchIsReserved et al — rules → deletion). So the
// destructive case is bounded to stock nothing else depends on: it is warned
// about, not blocked.
//
// No success phase: a clean delete CLOSES the dialog — closure is the
// confirmation and the shorter list behind it is the visible result
// (spec/ui-standards/controls.md § dialogs, D22; § action feedback, D21). The
// list clears selection + re-queries via onDeleted.
type Phase = 'confirm' | 'deleting' | 'error';

export const DeleteInboundShipmentsAction: Component<
  DeleteInboundShipmentsActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        onClick={() => setOpen(true)}
      >
        {t('button.delete')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (
  props: DeleteInboundShipmentsActionProps & { onClose: () => void }
) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal<string>();
  // The raw server text behind a disclosure, when the refusal arrived untyped.
  const [errorDetail, setErrorDetail] = createSignal<string>();
  // Snapshotted on open so neither can shift behind the open dialog.
  const count = props.selectedIds().length;
  const removesStock = props.removesStock();

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('deleting');
    const result = await graphqlFetch(
      DeleteInboundShipments,
      {
        storeId: props.storeId,
        ids: props.selectedIds().map(id => ({ id })),
      },
      // A per-line delete lock (transferred / reserved / stocktake-referenced —
      // rules → deletion) comes back as a TOP-LEVEL GraphQL error rather than a
      // typed DeleteInboundShipmentError. Take those here so the refusal lands
      // in the surface that fired the action (D21) instead of tripping the
      // global unexpected-error (reload) modal, which is what the user saw once
      // the New-only narrowing stopped hiding this path (issue #1134).
      { returnGraphqlErrors: true }
    );
    if (result.kind === 'graphqlError') {
      // Opting in also intercepts Forbidden, which owes the user the global
      // permission-denied modal (D38) — hand it back and close.
      if (isForbidden(result.errors)) {
        reportPermissionDenied(missingPermissions(result.errors));
        props.onClose();
        return;
      }
      // deleteRejection names the line lock when it can, and otherwise falls
      // back to the generic refusal + the raw server text behind a disclosure
      // (the server's own text there is a Rust debug dump, not user copy).
      const rejection = deleteRejection(result.errors);
      setErrorMessage(rejection.message);
      setErrorDetail(rejection.detail);
      setPhase('error');
      return;
    }
    if (result.kind !== 'success') {
      setPhase('confirm');
      return;
    }
    const items = result.data.batchInboundShipment.deleteInboundShipments ?? [];
    const firstError = items.find(
      i => i.response.__typename === 'DeleteInboundShipmentError'
    );
    if (
      firstError &&
      firstError.response.__typename === 'DeleteInboundShipmentError'
    ) {
      setErrorMessage(firstError.response.error.description);
      setPhase('error');
      return;
    }
    // Close first, then hand back to the list: onDeleted clears the selection,
    // which unmounts the selection-gated footer this dialog lives in.
    props.onClose();
    props.onDeleted();
  };

  return (
    <Dialog
      open
      dismissable={phase() !== 'deleting'}
      onClose={props.onClose}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      // The error phase is no longer a question, so the heading stops asking
      // one (it would otherwise read "Are you sure?" over a rejection).
      title={
        phase() === 'error'
          ? t('heading.cannot-do-that')
          : t('heading.are-you-sure')
      }
      description={
        <Switch
          fallback={
            <>
              {tPlural('messages.confirm-delete-shipments', count)}
              {/* Receipt reversal — informational, so the confirm still
                  submits (validation.md § actions). */}
              <Show when={removesStock}>
                <Alert severity="warning" testId="delete-removes-stock">
                  {t('messages.delete-removes-received-stock')}
                </Alert>
              </Show>
            </>
          }
        >
          <Match when={phase() === 'error'}>
            <Alert severity="error">
              {errorMessage()}
              <Show when={errorDetail()}>
                {detail => <ErrorDetails detail={detail()} />}
              </Show>
            </Alert>
          </Match>
        </Switch>
      }
      actions={
        <Switch
          fallback={
            // confirm / deleting: Cancel (hidden while deleting) + the loading
            // Delete. Icon-less verbs, delete in the danger tone (D55).
            <>
              <Show when={phase() === 'confirm'}>
                <CancelButton
                  data-testid="dialog-button-cancel"
                  onClick={props.onClose}
                />
              </Show>
              <Button
                variant="danger"
                confirms="plain"
                data-testid="confirmation-modal-ok"
                loading={phase() === 'deleting'}
                onClick={() => void run()}
              >
                {t('button.delete')}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'error'}>
            <Button
              variant="secondary"
              confirms="plain"
              onClick={props.onClose}
            >
              {t('button.close')}
            </Button>
          </Match>
        </Switch>
      }
    />
  );
};
