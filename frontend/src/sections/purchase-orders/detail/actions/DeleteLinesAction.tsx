import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Stack } from '@/ui/layout/Stack/Stack';
import { TrashIcon } from '@/ui/icons';
import {
  deletePurchaseOrderLines,
  type LinesOutcome,
} from '../purchaseOrderUpdate';

export interface DeleteLinesActionProps {
  storeId: string;
  selectedIds: () => string[];
  /** True unless the order is New or Ready for approval. */
  disabled: boolean;
  /** Lines went — clear the selection and re-read the page and the gates. */
  onChanged: () => void;
}

// Remove the selected lines (spec/purchase-orders S7 § line-selection
// actions): confirm → working → error over one dialog (kdd/action-modal). A
// clean sweep closes — the rows leaving is the confirmation — and a refusal
// keeps the dialog up, since the mutation answers per id and can partly
// succeed. onChanged clears the selection this footer is gated on, so it runs
// only once the dialog is closing.
type Phase =
  | { kind: 'confirm' }
  | { kind: 'working' }
  | { kind: 'error'; outcome: LinesOutcome };

export const DeleteLinesAction: Component<DeleteLinesActionProps> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        disabled={props.disabled}
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

const Body = (props: DeleteLinesActionProps & { onClose: () => void }) => {
  const [phase, setPhase] = createSignal<Phase>({ kind: 'confirm' });
  const count = props.selectedIds().length;

  const failure = () => {
    const p = phase();
    return p.kind === 'error' ? p.outcome : undefined;
  };

  const finish = (outcome: LinesOutcome) => {
    props.onClose();
    if (outcome.applied > 0) props.onChanged();
  };

  const run = async () => {
    if (phase().kind !== 'confirm') return;
    setPhase({ kind: 'working' });
    const outcome = await deletePurchaseOrderLines(
      props.storeId,
      props.selectedIds()
    );
    if (outcome.message) {
      setPhase({ kind: 'error', outcome });
      return;
    }
    finish(outcome);
  };

  return (
    <Dialog
      open
      dismissable={phase().kind === 'confirm'}
      onClose={props.onClose}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      title={
        failure() === undefined
          ? t('heading.are-you-sure')
          : (failure()?.applied ?? 0) > 0
            ? t('heading.some-not-deleted')
            : t('heading.cannot-do-that')
      }
      description={
        <Switch
          fallback={tPlural(
            'messages.confirm-delete-lines-purchase-order',
            count,
            { count }
          )}
        >
          <Match when={failure()}>
            {outcome => (
              <Stack gap="sm">
                <Show when={outcome().applied > 0}>
                  <p>{tPlural('messages.deleted-lines', outcome().applied)}</p>
                </Show>
                <Alert severity="error" testId="delete-lines-result">
                  {outcome().message}
                </Alert>
              </Stack>
            )}
          </Match>
        </Switch>
      }
      actions={
        <Show
          when={failure()}
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
                loading={phase().kind === 'working'}
                onClick={() => void run()}
              >
                {t('button.delete-lines')}
              </Button>
            </>
          }
        >
          {outcome => (
            <Button
              variant="secondary"
              confirms="plain"
              data-testid="dialog-button-ok"
              onClick={() => finish(outcome())}
            >
              {t('button.close')}
            </Button>
          )}
        </Show>
      }
    />
  );
};
