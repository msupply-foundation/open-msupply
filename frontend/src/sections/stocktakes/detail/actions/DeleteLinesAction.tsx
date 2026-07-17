import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import {
  CheckIcon,
  SearchIcon,
  TrashIcon,
  XCircleIcon,
} from '../../../../ui/icons';
import {
  runBatchStocktakeLines,
  type LineEditCommit,
} from '../lines/stocktakeLineUpdate';
import type { LineErrors } from '../lines/stocktakeLineErrors';

export interface DeleteLinesActionProps {
  storeId: string;
  /** The currently-selected line ids. */
  selectedIds: () => string[];
  /** Disabled while the stocktake is finalised / on hold. */
  disabled: boolean;
  /**
   * Apply what committed in place (the deleted ids drop from rows + selection,
   * no refetch).
   */
  onCommit: (commit: LineEditCommit) => void;
  /**
   * Partial failure — stamp the per-line errors (lineId → typename) so the
   * rows show them.
   */
  onError: (errors: LineErrors) => void;
  /**
   * The error phase's "Show error lines": filter the list to the stamped error
   * lines.
   */
  onShowErrors: () => void;
}

// The Delete-lines selection action: its footer button + a confirm → working →
// success | error modal.
//
// Written inline (not via a shared ActionModal) so the whole flow is readable
// in one place (kdd/explicit-composition). The deleted ids drop from the rows
// via onCommit; a line that couldn't be deleted is stamped (onError → rows show
// it) and the error phase offers "Show error lines" (onShowErrors). The phase
// lives in <Body>, mounted only while open (fresh per open; a late run() lands
// on a disposed scope).
export const DeleteLinesAction: Component<DeleteLinesActionProps> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<TrashIcon />}
        disabled={props.disabled}
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

type Phase = 'confirm' | 'working' | 'success' | 'error';

const Body = (props: DeleteLinesActionProps & { onClose: () => void }) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorCount, setErrorCount] = createSignal(0);
  // Count snapshotted on open (Body mounts once per open) so the
  // confirm/success message can't shift.
  const count = props.selectedIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('working');
    const outcome = await runBatchStocktakeLines(props.storeId, {
      delete: props.selectedIds().map(id => ({ id })),
    });
    if (!outcome) return props.onClose();
    props.onCommit(outcome.commit);
    if (outcome.errors.size === 0) return setPhase('success');
    props.onError(outcome.errors); // stamp so the rows show the errors too
    setErrorCount(outcome.errors.size);
    setPhase('error');
  };

  return (
    <Dialog
      open
      dismissable={phase() !== 'working'}
      onClose={props.onClose}
      icon={<TrashIcon />}
      title={t('heading.are-you-sure')}
      description={
        <Switch
          fallback={tPlural('messages.confirm-delete-stocktake_lines', count)}
        >
          <Match when={phase() === 'success'}>
            {tPlural('messages.deleted-lines', count)}
          </Match>
          <Match when={phase() === 'error'}>
            <Alert severity="error">
              {tPlural('messages.line-errors', errorCount())}
            </Alert>
          </Match>
        </Switch>
      }
      actions={
        <Switch
          fallback={
            // confirm / working: Cancel (hidden while working) + the loading
            // Delete.
            <>
              <Show when={phase() === 'confirm'}>
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
                loading={phase() === 'working'}
                onClick={() => void run()}
              >
                {t('button.delete-lines')}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'success'}>
            <Button
              variant="secondary"
              icon={<CheckIcon />}
              onClick={props.onClose}
            >
              {t('button.ok')}
            </Button>
          </Match>
          <Match when={phase() === 'error'}>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              onClick={props.onClose}
            >
              {t('button.cancel')}
            </Button>
            <Button
              variant="primary"
              icon={<SearchIcon />}
              onClick={() => {
                props.onShowErrors();
                props.onClose();
              }}
            >
              {t('button.show-error-lines')}
            </Button>
          </Match>
        </Switch>
      }
    />
  );
};
