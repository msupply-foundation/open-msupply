import { createSignal, For, Show, untrack, type Component } from 'solid-js';
import { t } from '@/intl';
import { reportPermissionDenied } from '@/api/graphql';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { TrashIcon } from '@/ui/icons';
import {
  deleteEach,
  type DeleteSummary,
  type WriteOutcome,
} from './writeOutcome';

// The bulk Delete for a list whose records are deleted ONE CALL EACH (the
// asset catalogue's items and log reasons, spec/asset-catalogue S5; Manage ›
// Plugins, spec/plugin-management S4): the footer button, then a confirm →
// deleting → outcome dialog (kdd/action-modal).
//
// A refusal of one record leaves the others: all deleted → the dialog closes
// and the list refreshes, closure being the confirmation (ui-standards/controls
// § dialogs); any refused → the dialog stays open on what was deleted (where
// the caller words it) and each refused record with its reason, while the list
// behind it refreshes so the deleted rows leave. A Forbidden goes to the
// permission-denied modal and a transport failure stays global, as everywhere.

export interface DeleteSelectedActionProps<R> {
  /** The selected records, read when the dialog opens. */
  selected: () => R[];
  /**
   * Refuse up front without the write's permissions. Omit where the screen's
   * own gate already guarantees them.
   */
  guard?: () => boolean;
  deleteOne: (record: R) => Promise<WriteOutcome>;
  /**
   * How many deletes are in flight at once (default: api/batches'
   * WRITE_CONCURRENCY). 1 where two records can name the same server row.
   */
  batchSize?: number;
  /** How a refused record is named — its code, or its reason text. */
  nameOf: (record: R) => string;
  /** The question, over the records snapshotted when the dialog opened. */
  confirmMessage: (records: readonly R[]) => string;
  /** The outcome's "N deleted" line. Omit for no such line. */
  deletedMessage?: (count: number) => string;
  refusedMessage: (count: number) => string;
  /** Something was deleted — re-query the list. */
  onChanged: () => void;
  /** The dialog closed after deleting — clear the selection. */
  onDone: () => void;
}

type Phase<R> =
  | { kind: 'confirm' }
  | { kind: 'deleting' }
  | { kind: 'outcome'; summary: DeleteSummary<R> };

export const DeleteSelectedAction = <R,>(
  props: DeleteSelectedActionProps<R>
): ReturnType<Component> => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        onClick={() => {
          if (props.guard?.() ?? true) setOpen(true);
        }}
      >
        {t('button.delete-lines')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = <R,>(
  props: DeleteSelectedActionProps<R> & { onClose: () => void }
) => {
  const [phase, setPhase] = createSignal<Phase<R>>({ kind: 'confirm' });
  // Snapshotted on open so the message and the run can't shift if the
  // selection changes behind the dialog.
  const records = untrack(() => props.selected());

  const finish = () => {
    props.onClose();
    props.onDone();
  };

  const run = async () => {
    if (phase().kind !== 'confirm') return;
    setPhase({ kind: 'deleting' });
    const summary = await deleteEach(records, props.deleteOne, props.batchSize);
    if (summary.deleted.length > 0) props.onChanged();
    if (summary.forbidden) {
      // The server's refusal routes to the same modal as the up-front mirror.
      reportPermissionDenied(summary.forbidden);
      props.onClose();
      return;
    }
    if (summary.refused.length === 0) {
      // A transport failure has already been reported globally; either way
      // there is nothing to hold the dialog open for.
      if (summary.failed && summary.deleted.length === 0)
        setPhase({ kind: 'confirm' });
      else finish();
      return;
    }
    setPhase({ kind: 'outcome', summary });
  };

  const outcome = () => {
    const p = phase();
    return p.kind === 'outcome' ? p.summary : undefined;
  };

  return (
    <Dialog
      open
      dismissable={phase().kind !== 'deleting'}
      onClose={() => (outcome() ? finish() : props.onClose())}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      title={
        outcome() ? t('heading.cannot-do-that') : t('heading.are-you-sure')
      }
      description={
        <Show when={outcome()} fallback={props.confirmMessage(records)}>
          {summary => (
            <Alert severity="error" testId="delete-outcome">
              <Show when={summary().deleted.length > 0 && props.deletedMessage}>
                {deletedMessage => (
                  <p>{deletedMessage()(summary().deleted.length)}</p>
                )}
              </Show>
              <p>{props.refusedMessage(summary().refused.length)}</p>
              <ul>
                <For each={summary().refused}>
                  {refusal => (
                    <li>
                      {props.nameOf(refusal.record)}: {refusal.reason}
                    </li>
                  )}
                </For>
              </ul>
            </Alert>
          )}
        </Show>
      }
      actions={
        <Show
          when={outcome()}
          fallback={
            <>
              <Show when={phase().kind === 'confirm'}>
                <CancelButton
                  data-testid="dialog-button-cancel"
                  onClick={props.onClose}
                />
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
          {/* Acknowledged, not aborted — what could be deleted was
              (ui-standards/controls § footer button identity). */}
          <Button
            variant="secondary"
            confirms="plain"
            data-testid="dialog-button-close"
            onClick={finish}
          >
            {t('button.close')}
          </Button>
        </Show>
      }
    />
  );
};
