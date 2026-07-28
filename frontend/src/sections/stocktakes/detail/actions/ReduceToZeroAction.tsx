import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../../../ui/utils/createFocusTarget';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import {
  CheckIcon,
  MinusCircleIcon,
  SearchIcon,
  XCircleIcon,
} from '../../../../ui/icons';
import { ReasonSelect } from '../../../../domain/reasonOptions';
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
        variant="secondary"
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

type Phase = 'confirm' | 'working' | 'success' | 'error';

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
    // showed it); just close.
    if (!outcome) return props.onClose();
    props.onCommit(outcome.commit);
    if (outcome.errors.size === 0) return setPhase('success');
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
          <Match when={phase() === 'success'}>
            {tPlural('messages.reduced-to-zero', props.selectedIds().length)}
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
            // Apply.
            <>
              <Show when={phase() === 'confirm'}>
                <Button
                  variant="secondary"
                  icon={<XCircleIcon />}
                  data-testid="dialog-button-cancel"
                  onClick={props.onClose}
                >
                  {t('button.cancel')}
                </Button>
              </Show>
              <Button
                variant="primary"
                icon={<CheckIcon />}
                loading={phase() === 'working'}
                data-testid="dialog-button-ok"
                onClick={() => void run()}
              >
                {t('button.apply')}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'success'}>
            <Button
              variant="secondary"
              icon={<CheckIcon />}
              data-testid="dialog-button-ok"
              onClick={props.onClose}
            >
              {t('button.ok')}
            </Button>
          </Match>
          <Match when={phase() === 'error'}>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              data-testid="dialog-button-cancel"
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
