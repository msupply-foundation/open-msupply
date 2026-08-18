import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { MinusCircleIcon } from '@/ui/icons';
import { ReasonSelect } from '@/domain/reasonOptions';
import {
  runBatchStocktakeLines,
  type LineEditCommit,
} from '../lines/stocktakeLineUpdate';
import type { LineErrors } from '../lines/stocktakeLineErrors';

export interface ReduceToZeroActionProps {
  storeId: string;
  selectedIds: () => string[];
  disabled: boolean;
  /**
   * Blind stocktake (spec/stocktakes › store-preference gates): no reason is
   * ever required under this preference, so the picker is omitted here too.
   */
  hideReason: boolean;
  /** Apply what committed in place (no refetch). */
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

// The Reduce-to-0 selection action: its footer button + a confirm → working →
// success | error modal (a negative-adjustment ReasonSelect setting
// countedNumberOfPacks = 0 on every selected line; the server enforces whether
// a reason is required).
//
// The modal is written inline (not via a shared ActionModal) so the whole flow
// — mutation, the phase transitions, what each phase renders — is readable in
// one place (kdd/explicit-composition). What committed splices in via onCommit;
// on a partial failure the offending lines are stamped (onError) so they also
// show inline on the detail rows, and the error phase offers "Show error lines"
// (onShowErrors filters to them). The phase lives in <Body>, mounted only while
// open, so it's fresh on every open and a late-resolving run() from a prior
// open lands on a disposed scope.
export const ReduceToZeroAction: Component<ReduceToZeroActionProps> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="danger"
        icon={<MinusCircleIcon />}
        disabled={props.disabled}
        data-testid="reduce-lines-to-zero-button"
        onClick={() => setOpen(true)}
      >
        {t('button.reduce-lines-to-zero')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

// No success phase: a clean apply CLOSES the dialog — closure is the
// confirmation and the zeroed rows behind it are the visible result
// (spec/ui-standards/controls.md § dialogs, D22; § action feedback, D21).
type Phase = 'confirm' | 'working' | 'error';

const Body = (props: ReduceToZeroActionProps & { onClose: () => void }) => {
  const [reasonId, setReasonId] = createSignal<string | null>(null);
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorCount, setErrorCount] = createSignal(0);

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('working');
    const outcome = await runBatchStocktakeLines(props.storeId, {
      update: props.selectedIds().map(id => ({
        id,
        countedNumberOfPacks: 0,
        reasonOptionId: reasonId(),
      })),
    });
    // Transport / NodeError → outcome undefined (the global modal already
    // showed it); stay on the confirm phase with the pick intact.
    if (!outcome) return setPhase('confirm');
    props.onCommit(outcome.commit);
    // Clean apply: close — the rows already read zero.
    if (outcome.errors.size === 0) return props.onClose();
    props.onError(outcome.errors); // stamp so the rows show the errors too
    setErrorCount(outcome.errors.size);
    setPhase('error');
  };

  // The reason picker is the confirm phase's only control, so the dialog opens
  // on it — unless the store preference hides it, leaving nothing to focus
  // (ui-standards › accessibility › keyboard).
  const reasonPicker = createFocusTarget();

  return (
    <Dialog
      open
      initialFocus={props.hideReason ? undefined : reasonPicker}
      dismissable={phase() !== 'working'}
      onClose={props.onClose}
      icon={<MinusCircleIcon />}
      testId="confirmation-modal"
      title={t('button.reduce-lines-to-zero')}
      description={
        <Switch
          fallback={
            <>
              <p>{t('messages.confirm-reduce-lines-to-zero')}</p>
              <Show when={!props.hideReason}>
                <FieldRow label={t('label.reason')}>
                  <ReasonSelect
                    kind="negative"
                    label={t('label.reason')}
                    hideLabel
                    focusTarget={reasonPicker}
                    value={reasonId() ?? undefined}
                    onChange={r => setReasonId(r?.id ?? null)}
                  />
                </FieldRow>
              </Show>
            </>
          }
        >
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
            // Apply.
            <>
              <Show when={phase() === 'confirm'}>
                <CancelButton
                  data-testid="dialog-button-cancel"
                  onClick={props.onClose}
                />
              </Show>
              <Button
                variant="danger"
                loading={phase() === 'working'}
                confirms="plain"
                data-testid="dialog-button-ok"
                onClick={() => void run()}
              >
                {t('button.apply')}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'error'}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
            <Button
              variant="primary"
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
