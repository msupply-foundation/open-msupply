import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { ErrorDetails } from '../../../../ui/elements/feedback/ErrorDetails';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../../ui/elements/buttons/StandardButtons';
import { Stack } from '../../../../ui/layout/Stack/Stack';
import { TrashIcon } from '../../../../ui/icons';
import { deleteInboundShipments } from '../deleteInboundShipments';
import type { InboundScope } from '../../inboundShipmentScope';

export interface DeleteInboundShipmentsActionProps {
  storeId: string;
  /**
   * The selection, each id with the scope its shipment belongs to — the delete
   * is twinned per scope (see deleteInboundShipments), so the id alone is not
   * enough to submit it.
   */
  selection: () => { id: string; scope: InboundScope }[];
  /**
   * Whether the selection includes a shipment that has already introduced stock
   * (anything past New) — the confirmation says so, because that stock goes
   * with it.
   */
  removesStock: () => boolean;
  /** Re-query the list behind the dialog. */
  refetchList: () => void;
  /** Drop the selection — the rows it named are gone. */
  clearSelection: () => void;
}

// The inbound-shipments-list bulk delete (spec AC-L3): footer button + a
// confirm → deleting → error dialog. Mirrors DeleteStocktakesAction. The server
// is the source of truth and the action is SUBMITTED rather than pre-screened —
// no client-side copy of the server's delete window, and the button is never
// disabled because the selection "might" contain an undeletable row
// (spec/ui-standards/validation.md § actions; issue #1134). Each scope's batch
// is atomic (AC-BA1): if any row can't be deleted that whole batch fails and
// nothing in it is removed, so on error we show the server's reason (a per-line
// lock can surface here too, per rules → deletion) — which is strictly more
// informative than the old blanket "Only New shipments can be deleted" hover
// text.
//
// The selection is submitted as ONE BATCH PER SCOPE, because the batch mutation
// is twinned like every other inbound write (issue #1213 — see
// deleteInboundShipments). So a mixed selection can end up PARTLY deleted: the
// plain batch commits and the PO-linked one is refused. That outcome is
// reported rather than hidden — the title stops claiming nothing happened, the
// body says how many went, and the list re-queries behind the dialog.
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
// list clears selection + re-queries.
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
  // How many shipments the run actually removed. Read by the title and body, so
  // a signal.
  const [deletedCount, setDeletedCount] = createSignal(0);
  // Snapshotted on open so neither can shift behind the open dialog.
  const count = props.selection().length;
  const removesStock = props.removesStock();

  // Ending the interaction: close FIRST, then hand back — clearing the
  // selection unmounts the selection-gated footer this dialog lives in. The
  // selection is dropped only when rows actually went; a refusal that removed
  // nothing leaves the list untouched, so the user keeps their selection to
  // adjust it.
  const finish = () => {
    props.onClose();
    if (deletedCount() > 0) props.clearSelection();
  };

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('deleting');
    const outcome = await deleteInboundShipments(
      props.storeId,
      props.selection()
    );
    setDeletedCount(outcome.deleted);
    // Whatever else happened, rows that went have to leave the list.
    if (outcome.deleted > 0) props.refetchList();

    if (outcome.forbidden) {
      // The global permission-denied modal (D38) is already showing; this
      // dialog has nothing to add.
      finish();
      return;
    }
    if (outcome.failed) {
      // Transport/unexpected — graphqlFetch already surfaced it globally. Back
      // to the confirmation so the action can be retried.
      setPhase('confirm');
      return;
    }
    if (outcome.message) {
      setErrorMessage(outcome.message);
      setErrorDetail(outcome.detail);
      setPhase('error');
      return;
    }
    finish();
  };

  return (
    <Dialog
      open
      dismissable={phase() !== 'deleting'}
      onClose={finish}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      // The error phase is no longer a question, so the heading stops asking
      // one (it would otherwise read "Are you sure?" over a rejection) — and
      // when the other scope's batch DID commit, "Can't do that!" would sit
      // over an outcome that partly succeeded.
      title={
        phase() !== 'error'
          ? t('heading.are-you-sure')
          : deletedCount() > 0
            ? t('heading.some-not-deleted')
            : t('heading.cannot-do-that')
      }
      description={
        <Switch
          fallback={
            <Stack gap="sm">
              {tPlural('messages.confirm-delete-shipments', count)}
              {/* Receipt reversal — informational, so the confirm still
                  submits (validation.md § actions). */}
              <Show when={removesStock}>
                <Alert severity="warning" testId="delete-removes-stock">
                  {t('messages.delete-removes-received-stock')}
                </Alert>
              </Show>
            </Stack>
          }
        >
          <Match when={phase() === 'error'}>
            <Stack gap="sm">
              <Show when={deletedCount() > 0}>
                <p>{tPlural('messages.deleted-shipments', deletedCount())}</p>
              </Show>
              <Alert severity="error">
                {errorMessage()}
                <Show when={errorDetail()}>
                  {detail => <ErrorDetails detail={detail()} />}
                </Show>
              </Alert>
            </Stack>
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
            <Button variant="secondary" confirms="plain" onClick={finish}>
              {t('button.close')}
            </Button>
          </Match>
        </Switch>
      }
    />
  );
};
