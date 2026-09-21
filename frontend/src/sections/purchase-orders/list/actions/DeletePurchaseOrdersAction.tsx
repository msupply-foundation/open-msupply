import { createSignal, For, Match, Show, Switch } from 'solid-js';
import type { Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Stack } from '@/ui/layout/Stack/Stack';
import { TrashIcon } from '@/ui/icons';
import { DeletePurchaseOrder } from '../purchaseOrders.generated';
import {
  deleteOutcome,
  summariseOutcomes,
  type DeleteSummary,
  type PurchaseOrderSelection,
} from '../deletePurchaseOrders';

export interface DeletePurchaseOrdersActionProps {
  storeId: string;
  /** The currently-selected orders — id to delete, number to name it by. */
  selection: () => PurchaseOrderSelection[];
  /** Re-query the list so the deleted rows disappear. Safe mid-flow. */
  refetchList: () => void;
  /**
   * Clear the list selection. The selection gates the footer this dialog
   * lives in, so calling this unmounts the dialog — only call it when the
   * interaction has ended with nothing left to show (issue #374).
   */
  clearSelection: () => void;
}

// The purchase-orders-list delete action (spec/purchase-orders S3): its footer
// button + a confirm → deleting → report dialog, shaped like the locations
// list's, which has the same problem — there is NO batch mutation, so the
// selection is N independent deletePurchaseOrder calls, each succeeding or
// failing on its own (contract § deleting an order from the list).
//
// Nothing is pre-screened. An order past Ready for approval will be refused,
// but deletability is the admissibility of an ACTION, not a standing property
// of the row, so the selection is submitted and the server's verdict reported
// (ui-standards/validation.md § actions) — deliberately unlike the reference
// app, which disables Delete when the selection holds an undeletable order and
// so keeps a second copy of the domain rule.
//
// Per-call GraphQL errors are taken via returnGraphqlErrors so one blocked
// order degrades to a line in the report instead of tripping the global
// unexpected-error (reload) modal mid-bulk. That matters here: an order an
// external inbound shipment points at fails as a top-level `Internal error`
// (OMS-FUN-PO-15.13, contract ⚠️) rather than as a typed member.
//
// Full success needs no announcement: the dialog closes, the rows leave the
// list, the selection clears — closure is the confirmation
// (ui-standards/controls.md § action feedback, which forbids the toast the
// reference app shows here). Any refused or failed member switches the dialog
// to the report instead; the deleted ones are already gone behind it.
type Phase =
  | { kind: 'confirm' }
  | { kind: 'deleting' }
  | { kind: 'report'; summary: DeleteSummary };

export const DeletePurchaseOrdersAction: Component<
  DeletePurchaseOrdersActionProps
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
        {t('button.delete-lines')}
      </Button>
      <Show when={open()}>
        <DeletePurchaseOrdersDialog
          storeId={props.storeId}
          selection={props.selection}
          onClose={() => setOpen(false)}
          onSettled={props.refetchList}
          onFinished={props.clearSelection}
        />
      </Show>
    </>
  );
};

export interface DeletePurchaseOrdersDialogProps {
  storeId: string;
  /** The orders to delete — id to delete, number to name it by. */
  selection: () => PurchaseOrderSelection[];
  onClose: () => void;
  /**
   * The deletes have returned and the deleted orders are gone, whether or not
   * the dialog stays up to report the rest. Safe mid-flow.
   */
  onSettled?: (summary: DeleteSummary) => void;
  /**
   * The interaction has ended — a clean sweep closed the dialog, or the
   * report was dismissed. Whatever unmounts this dialog's host belongs here.
   */
  onFinished: (summary: DeleteSummary) => void;
}

// The confirm → deleting → report dialog, shared by the list's bulk delete and
// the side panel's single-order Delete, which passes a selection of one.
export const DeletePurchaseOrdersDialog = (
  props: DeletePurchaseOrdersDialogProps
) => {
  const [phase, setPhase] = createSignal<Phase>({ kind: 'confirm' });
  // Snapshotted on open (Body mounts once per open) so the confirm count and
  // the id → number labelling can't shift if the selection changes behind the
  // dialog.
  const orders = props.selection();

  const labelFor = (id: string): string => {
    const number = orders.find(order => order.id === id)?.number;
    return number === undefined ? id : String(number);
  };

  const run = async () => {
    if (phase().kind !== 'confirm') return; // re-entry guard
    setPhase({ kind: 'deleting' });
    // N independent calls, sequential: each order succeeds or fails on its
    // own, so a refused one never blocks the rest.
    const outcomes = [];
    for (const order of orders) {
      const result = await graphqlFetch(
        DeletePurchaseOrder,
        { storeId: props.storeId, id: order.id },
        { returnGraphqlErrors: true }
      );
      outcomes.push(deleteOutcome(order.id, result));
    }
    const summary = summariseOutcomes(outcomes);
    if (summary.notDeletable.length === 0 && summary.failedCount === 0) {
      // Close first — the host's onFinished may unmount what this dialog
      // lives in (the list clears its selection-gated footer).
      props.onClose();
      props.onFinished(summary);
      props.onSettled?.(summary);
      return;
    }
    // Some members were refused or failed: the deleted ones are gone
    // regardless, so the host may re-query behind the dialog — but nothing
    // that unmounts it runs until the report is dismissed (issue #374).
    props.onSettled?.(summary);
    setPhase({ kind: 'report', summary });
  };

  const dismissReport = () => {
    const summary = report();
    props.onClose();
    if (summary) props.onFinished(summary);
  };

  const report = () => {
    const p = phase();
    return p.kind === 'report' ? p.summary : undefined;
  };

  return (
    <Dialog
      open
      // Blocking while the deletes are in flight, and the report must be
      // acknowledged: Close is the only way out.
      dismissable={phase().kind === 'confirm'}
      onClose={props.onClose}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      // The title tracks the phase — a report is not a question
      // (kdd/action-modal). These deletes are independent, so when some
      // members DID go, "Can't do that!" would sit over a report saying they
      // are gone.
      title={
        phase().kind !== 'report'
          ? t('heading.are-you-sure')
          : (report()?.deletedCount ?? 0) > 0
            ? t('heading.some-not-deleted')
            : t('heading.cannot-do-that')
      }
      description={
        <Switch
          // Confirm / deleting: the permanence notice, naming how many. It
          // mentions neither an order's state nor a shipment reference, though
          // either can refuse the deletion (spec S3).
          fallback={tPlural(
            'messages.confirm-delete-purchase-orders',
            orders.length
          )}
        >
          <Match when={report()}>
            {summary => (
              <Stack gap="sm">
                <Show when={summary().deletedCount > 0}>
                  <p>
                    {tPlural(
                      'messages.deleted-purchase-orders',
                      summary().deletedCount
                    )}
                  </p>
                </Show>
                {/* The refused orders, each named by its number. The server's
                    own description ("Cannot delete non-new purchase order") is
                    not a user-facing sentence, so the rule is stated here
                    instead (OMS-FUN-PO-15.11). */}
                <For each={summary().notDeletable}>
                  {id => (
                    <Alert
                      severity="error"
                      testId="purchase-order-not-deletable"
                    >
                      {t('messages.cannot-delete-purchase-order', {
                        number: labelFor(id),
                      })}
                    </Alert>
                  )}
                </For>
                {/* Undifferentiated failures — an order a shipment points at
                    among them (OMS-FUN-PO-15.13): counted, because nothing on
                    the wire says which cause it was. */}
                <Show when={summary().failedCount > 0}>
                  <Alert severity="error" testId="purchase-order-delete-failed">
                    {tPlural(
                      'messages.error-deleting-purchase-orders',
                      summary().failedCount
                    )}
                  </Alert>
                </Show>
              </Stack>
            )}
          </Match>
        </Switch>
      }
      actions={
        <Show
          when={report()}
          fallback={
            <>
              <Show when={phase().kind === 'confirm'}>
                <CancelButton onClick={props.onClose} />
              </Show>
              <Button
                variant="danger"
                confirms="plain"
                data-testid="confirmation-modal-ok"
                loading={phase().kind === 'deleting'}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </>
          }
        >
          {/* The report must be acknowledged: Close is the only way out, so it
              is this state's confirm. */}
          <Button variant="secondary" confirms="plain" onClick={dismissReport}>
            {t('button.close')}
          </Button>
        </Show>
      }
    />
  );
};
