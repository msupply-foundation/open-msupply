import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Stack } from '@/ui/layout/Stack/Stack';
import { LockIcon } from '@/ui/icons';
import {
  closePurchaseOrderLines,
  type LinesOutcome,
} from '../purchaseOrderUpdate';

export interface CloseLinesActionProps {
  storeId: string;
  selectedIds: () => string[];
  /** Offered on a SENT order, and only there. */
  disabled: boolean;
  onChanged: () => void;
}

// Close the selected lines for receipt (spec/purchase-orders S7 §
// line-selection actions) — the only surface that changes a line's status
// (rules § line status). Same phase machine as DeleteLinesAction: a clean
// sweep closes, a refusal keeps the dialog up naming how many did close. One
// call per line on the wire, so a refusal never stops the rest.
type Phase =
  | { kind: 'confirm' }
  | { kind: 'working' }
  | { kind: 'error'; outcome: LinesOutcome };

export const CloseLinesAction: Component<CloseLinesActionProps> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<LockIcon />}
        disabled={props.disabled}
        data-testid="close-lines-button"
        onClick={() => setOpen(true)}
      >
        {t('button.close-purchase-order-lines')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (props: CloseLinesActionProps & { onClose: () => void }) => {
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
    const outcome = await closePurchaseOrderLines(
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
      icon={<LockIcon />}
      testId="confirmation-modal"
      title={
        failure() === undefined
          ? t('heading.are-you-sure')
          : (failure()?.applied ?? 0) > 0
            ? t('heading.some-not-closed')
            : t('heading.cannot-do-that')
      }
      description={
        <Switch
          fallback={tPlural(
            'messages.confirm-close-purchase-order-lines',
            count,
            { count }
          )}
        >
          <Match when={failure()}>
            {outcome => (
              <Stack gap="sm">
                <Show when={outcome().applied > 0}>
                  <p>
                    {tPlural(
                      'messages.closed-purchase-order-lines',
                      outcome().applied,
                      { count: outcome().applied }
                    )}
                  </p>
                </Show>
                <Alert severity="error" testId="close-lines-result">
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
                {t('button.close-purchase-order-lines')}
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
