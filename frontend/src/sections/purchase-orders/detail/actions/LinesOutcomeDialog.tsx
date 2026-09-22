import { createSignal, Match, Show, Switch, type JSX } from 'solid-js';
import { t } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Stack } from '@/ui/layout/Stack/Stack';
import type { LinesOutcome } from '../purchaseOrderUpdate';

export interface LinesOutcomeDialogProps {
  selectedIds: () => string[];
  icon: JSX.Element;
  /** The verb, on the confirm button. */
  confirmLabel: string;
  confirmMessage: (count: number) => string;
  /** The title when some lines went and others did not. */
  partialTitle: string;
  /** How many did go, shown beside the refusal. */
  appliedMessage: (applied: number) => string;
  resultTestId: string;
  /** The per-line fold over the snapshotted selection. */
  run: (ids: string[]) => Promise<LinesOutcome>;
  onClose: () => void;
  /** Lines changed — the host clears its selection and re-reads. */
  onChanged: () => void;
}

// The confirm → working → error machine (kdd/action-modal) both line actions
// share: a clean sweep closes — the rows changing is the confirmation — and a
// refusal keeps the dialog up naming how many did go, since the wire answers
// per line and can partly succeed. onChanged runs only once the dialog is
// closing, because the host's selection-gated footer unmounts on it.
type Phase =
  | { kind: 'confirm' }
  | { kind: 'working' }
  | { kind: 'error'; outcome: LinesOutcome };

export const LinesOutcomeDialog = (props: LinesOutcomeDialogProps) => {
  const [phase, setPhase] = createSignal<Phase>({ kind: 'confirm' });
  // Snapshotted on open: the selection behind the dialog must not move the
  // confirmed count or what the run acts on.
  // eslint-disable-next-line solid/reactivity
  const ids = props.selectedIds();

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
    const outcome = await props.run(ids);
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
      icon={props.icon}
      testId="confirmation-modal"
      title={
        failure() === undefined
          ? t('heading.are-you-sure')
          : (failure()?.applied ?? 0) > 0
            ? props.partialTitle
            : t('heading.cannot-do-that')
      }
      description={
        <Switch fallback={props.confirmMessage(ids.length)}>
          <Match when={failure()}>
            {outcome => (
              <Stack gap="sm">
                <Show when={outcome().applied > 0}>
                  <p>{props.appliedMessage(outcome().applied)}</p>
                </Show>
                <Alert severity="error" testId={props.resultTestId}>
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
                {props.confirmLabel}
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
