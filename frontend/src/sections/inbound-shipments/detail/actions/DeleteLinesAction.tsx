import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CheckIcon, TrashIcon, XCircleIcon } from '../../../../ui/icons';
import { runInboundBatch } from '../inboundShipmentUpdate';
import type { InboundLineErrors } from '../inboundShipmentUpdate';

export interface LineActionProps {
  storeId: string;
  isExternal: boolean;
  selectedIds: () => string[];
  disabled: boolean;
  /** A commit happened — the view refetches the lines page + clears selection. */
  onChanged: () => void;
  /** Per-line failures — stamped inline in the table. */
  onError: (errors: InboundLineErrors) => void;
}

// Bulk delete selected stock-in lines (spec S3 → line-selection actions, FL5).
// The batch is atomic; a per-line lock (reserved stock, transferred-in,
// stocktake-referenced) fails and its reason is surfaced. Mirrors the stocktake
// DeleteLinesAction pattern.
type Phase = 'confirm' | 'working' | 'error';

export const DeleteLinesAction: Component<LineActionProps> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
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

const Body = (props: LineActionProps & { onClose: () => void }) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal<string>();
  const count = props.selectedIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('working');
    const outcome = await runInboundBatch(props.storeId, props.isExternal, {
      deleteInboundShipmentLines: props.selectedIds().map(id => ({ id })),
    });
    if (!outcome) return props.onClose();
    if (outcome.errors.size > 0) {
      props.onError(outcome.errors);
      setErrorMessage([...outcome.errors.values()][0]);
      setPhase('error');
      return;
    }
    props.onChanged();
    props.onClose();
  };

  return (
    <Dialog
      open
      dismissable={phase() !== 'working'}
      onClose={props.onClose}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      title={t('heading.are-you-sure')}
      description={
        <Switch fallback={tPlural('messages.confirm-delete-lines', count)}>
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
                loading={phase() === 'working'}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'error'}>
            <Button icon={<CheckIcon />} onClick={props.onClose}>
              {t('button.close')}
            </Button>
          </Match>
        </Switch>
      }
    />
  );
};
