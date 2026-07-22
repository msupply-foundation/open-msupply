import { createSignal, For, Match, Show, Switch } from 'solid-js';
import type { Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CheckIcon, TrashIcon, XCircleIcon } from '../../../../ui/icons';
import { DeleteLocation } from '../locations.generated';
import {
  deleteOutcome,
  summariseOutcomes,
  type DeleteSummary,
} from '../deleteLocations';
import type { LocationRow } from '../locationEdit';

export interface DeleteLocationsActionProps {
  storeId: string;
  /** The currently-selected location rows (code/name label the report). */
  selectedRows: () => LocationRow[];
  /** Re-query the list so the deleted rows disappear. Safe mid-flow. */
  refetchList: () => void;
  /**
   * Clear the list selection. The selection gates the footer this dialog
   * lives in, so calling this unmounts the dialog — only call it when the
   * interaction has ended with nothing left to show (issue #374).
   */
  clearSelection: () => void;
}

// The locations-list delete action (spec/locations S3): its footer button + a
// confirm → deleting → report dialog, a peer of the reference vertical's
// DeleteStocktakesAction. Differences are the spec's own: there is NO batch
// mutation — the selection is N independent deleteLocation calls, each
// succeeding or failing on its own (AC-D3, contract.md § deletion) — and a
// failure is PER LOCATION: the typed LocationInUse rejection feeds the in-use
// report (AC-D2), while untyped failures (movement history → plain Internal
// error, AC-D5) are counted, not detailed. The per-call GraphQL errors are
// taken via returnGraphqlErrors so one blocked location degrades to a line in
// the report instead of tripping the global unexpected-error (reload) modal
// mid-bulk — the outcome lands in the initiating surface (D21).
//
// Nothing is deleted until the confirmation is accepted (AC-D4). Full success
// needs no announcement: the dialog closes, the rows leave the list, the
// selection clears (ui-surface S3). Any blocked/failed member switches the
// dialog to the report instead — the deleted ones are already gone behind it.
// While the report is up the selection is deliberately KEPT: it gates the
// footer this dialog is mounted in, so clearing it would dispose the dialog
// before the report renders (issue #374; same disposal trap as the stocktakes
// reference's error path). It clears when the report is dismissed.
type Phase =
  | { kind: 'confirm' }
  | { kind: 'deleting' }
  | { kind: 'report'; summary: DeleteSummary };

export const DeleteLocationsAction: Component<
  DeleteLocationsActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        onClick={() => setOpen(true)}
      >
        {t('button.delete-lines')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (props: DeleteLocationsActionProps & { onClose: () => void }) => {
  const [phase, setPhase] = createSignal<Phase>({ kind: 'confirm' });
  // Rows snapshotted on open (Body mounts once per open) so the messages and
  // the id → code labelling can't shift if the selection changes behind the
  // dialog.
  const rows = props.selectedRows();

  const labelFor = (id: string): string =>
    rows.find(row => row.id === id)?.code ?? id;

  const run = async () => {
    if (phase().kind !== 'confirm') return; // re-entry guard (AC-D4)
    setPhase({ kind: 'deleting' });
    // N independent calls, sequential: each location succeeds or fails on its
    // own — an in-use member never blocks the rest (AC-D3). GraphQL errors are
    // returned (not globally surfaced) so an untyped per-location failure
    // (AC-D5) becomes a report line, not an app-level error.
    const outcomes = [];
    for (const row of rows) {
      const result = await graphqlFetch(
        DeleteLocation,
        { storeId: props.storeId, input: { id: row.id } },
        { returnGraphqlErrors: true }
      );
      outcomes.push(deleteOutcome(row.id, result));
    }
    const summary = summariseOutcomes(outcomes);
    if (summary.inUse.length === 0 && summary.failedCount === 0) {
      // Full success needs no announcement (ui-surface S3): closure is the
      // confirmation. Close first — clearing the selection unmounts the
      // selection-gated footer this dialog lives in.
      props.onClose();
      props.clearSelection();
      props.refetchList();
      return;
    }
    // Some members were blocked/failed: the deleted ones are gone regardless
    // (AC-D3) — re-query behind the dialog, but KEEP the selection: clearing
    // it here would unmount the footer (and this dialog) before the report
    // ever renders (issue #374). The selection clears on dismissal instead.
    props.refetchList();
    setPhase({ kind: 'report', summary });
  };

  // Dismissing the report ends the interaction: close, then hand back to the
  // list (same close-before-unmount ordering as the success path).
  const dismissReport = () => {
    props.onClose();
    props.clearSelection();
  };

  const report = () => {
    const p = phase();
    return p.kind === 'report' ? p.summary : undefined;
  };

  return (
    <Dialog
      open
      // Blocking while the deletes are in flight, and the report must be
      // acknowledged (a blocking alert — ui-surface S3): Close is the only
      // way out.
      dismissable={phase().kind === 'confirm'}
      onClose={props.onClose}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      title={t('heading.are-you-sure')}
      description={
        <Switch
          // Confirm / deleting: how many will be deleted (AC-D4).
          fallback={tPlural('messages.confirm-delete-locations', rows.length)}
        >
          <Match when={report()}>
            {summary => (
              <>
                <Show when={summary().deletedCount > 0}>
                  <p>
                    {tPlural(
                      'messages.deleted-locations',
                      summary().deletedCount
                    )}
                  </p>
                </Show>
                {/* The in-use report: each blocked location with the
                    references that block it (AC-D2, AC-D3). */}
                <For each={summary().inUse}>
                  {blocked => (
                    <Alert severity="error" testId="location-in-use">
                      {t('messages.location-in-use', {
                        code: labelFor(blocked.id),
                        stockLines: blocked.stockLines,
                        invoiceLines: blocked.invoiceLines,
                      })}
                    </Alert>
                  )}
                </For>
                {/* Untyped failures (movement history — AC-D5): counted. */}
                <Show when={summary().failedCount > 0}>
                  <Alert severity="error" testId="location-delete-failed">
                    {tPlural(
                      'messages.error-deleting-locations',
                      summary().failedCount
                    )}
                  </Alert>
                </Show>
              </>
            )}
          </Match>
        </Switch>
      }
      actions={
        <Show
          when={report()}
          fallback={
            // confirm / deleting: Cancel (hidden while deleting) + the loading
            // Delete (AC-D4 — nothing is deleted until confirmed).
            <>
              <Show when={phase().kind === 'confirm'}>
                <Button
                  variant="secondary"
                  icon={<XCircleIcon />}
                  onClick={props.onClose}
                >
                  {t('button.cancel')}
                </Button>
              </Show>
              <Button
                variant="secondary"
                icon={<TrashIcon />}
                data-testid="confirmation-modal-ok"
                loading={phase().kind === 'deleting'}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </>
          }
        >
          <Button
            variant="secondary"
            icon={<CheckIcon />}
            onClick={dismissReport}
          >
            {t('button.close')}
          </Button>
        </Show>
      }
    />
  );
};
