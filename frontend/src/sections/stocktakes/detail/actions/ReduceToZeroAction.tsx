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
  /**
   * Apply what committed in place (no refetch). `keepSelection` holds the
   * selection open on a partial outcome: this dialog lives INSIDE the
   * selection footer, so clearing the selection unmounts it mid-report
   * (issue #1150).
   */
  onCommit: (
    commit: LineEditCommit,
    opts?: { keepSelection?: boolean }
  ) => void;
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
// success | summary modal (a negative-adjustment ReasonSelect setting
// countedNumberOfPacks = 0 on every selected line; the server enforces whether
// a reason is required).
//
// Selected lines are INDEPENDENT of each other, so the batch runs with
// continueOnError: every line the server accepts is reduced and the rest report
// their own error — the outcome then says how many of each (issue #1150). A
// line is commonly rejected for a legitimate reason: reducing it to 0 would
// drive its stock line's available quantity negative, because some of its packs
// are already allocated to outbound shipments that haven't been picked. Those
// lines CANNOT be reduced to 0 (until the allocation is picked or cancelled),
// so the summary names that as the cause rather than inviting a retry.
//
// The modal is written inline (not via a shared ActionModal) so the whole flow
// — mutation, the phase transitions, what each phase renders — is readable in
// one place (kdd/explicit-composition). What committed splices in via onCommit;
// the offending lines are stamped (onError) so they also show inline on the
// detail rows, and the summary offers "Show error lines" (onShowErrors filters
// to them). The phase lives in <Body>, mounted only while open, so it's fresh
// on every open and a late-resolving run() from a prior open lands on a
// disposed scope.
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

// No success phase: an apply where EVERY line reduced closes the dialog —
// closure is the confirmation and the zeroed rows behind it are the visible
// result (spec/ui-standards/controls.md § dialogs, D22; § action feedback, D21).
// A mixed outcome has something only a message can carry (how many reduced, how
// many couldn't and why), so that one stays open on the summary phase.
type Phase = 'confirm' | 'working' | 'summary';

const Body = (props: ReduceToZeroActionProps & { onClose: () => void }) => {
  const [reasonId, setReasonId] = createSignal<string | null>(null);
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [reducedCount, setReducedCount] = createSignal(0);
  const [errors, setErrors] = createSignal<LineErrors>(new Map());

  const errorCount = () => errors().size;
  // Every rejection is the reserved-stock rule → name that cause outright. A
  // mixed bag (a reason became invalid, the stocktake was locked meanwhile)
  // falls back to the bare count, since one sentence can't explain all of them.
  const allReservedStock = () =>
    errorCount() > 0 &&
    [...errors().values()].every(e => e === 'StockLineReducedBelowZero');

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('working');
    const outcome = await runBatchStocktakeLines(props.storeId, {
      update: props.selectedIds().map(id => ({
        id,
        countedNumberOfPacks: 0,
        reasonOptionId: reasonId(),
      })),
      // Independent lines: each stands or falls alone. Without this the server
      // rolls the whole selection back over one rejected line — while still
      // reporting the rest as saved (issue #1150).
      continueOnError: true,
    });
    // Transport / NodeError → outcome undefined (the global modal already
    // showed it); stay on the confirm phase with the pick intact.
    if (!outcome) return setPhase('confirm');
    const failed = outcome.errors.size;
    // keepSelection on a mixed outcome: this dialog is a child of the selection
    // footer, so letting the commit clear the selection would unmount it before
    // the summary below could be read (issue #1150).
    props.onCommit(outcome.commit, { keepSelection: failed > 0 });
    // Every line reduced: close — the rows already read zero.
    if (failed === 0) return props.onClose();
    props.onError(outcome.errors); // stamp so the rows show the errors too
    setReducedCount(outcome.commit.updated.length);
    setErrors(outcome.errors);
    setPhase('summary');
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
          <Match when={phase() === 'summary'}>
            {/* Two facts, two lines: what WAS reduced (the action did work, so
                this is not a plain error) and what wasn't, with the cause when
                every rejection shares one. severity="warning" because the
                result is partial, not failed. */}
            <Alert severity="warning" testId="reduce-to-zero-summary">
              <Show when={reducedCount() > 0}>
                <p>{tPlural('messages.lines-reduced', reducedCount())}</p>
              </Show>
              <p>{tPlural('messages.lines-not-reduced', errorCount())}</p>
              <Show when={allReservedStock()}>
                <p>{t('error.reduced-below-zero')}</p>
              </Show>
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
          <Match when={phase() === 'summary'}>
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
