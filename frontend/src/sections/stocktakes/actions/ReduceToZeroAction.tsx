import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { CheckIcon, MinusCircleIcon, XCircleIcon, SearchIcon } from '../../../ui/icons';
import { ReasonSelect } from '../../../domain/reasonOptions';
import { runBatchStocktakeLines, type LineEditCommit } from '../stocktakeLineUpdate';
import type { LineErrors } from '../stocktakeLineErrors';

export interface ReduceToZeroActionProps {
  storeId: string;
  selectedIds: () => string[];
  disabled: boolean;
  /** Apply what committed in place (no refetch). */
  onCommit: (commit: LineEditCommit) => void;
  /** Stamp the per-line errors (lineId → typename) so the failed rows show them. */
  onErrors: (errors: LineErrors) => void;
  onShowErrors: (lineIds: string[]) => void;
}

// The Reduce-to-0 selection action: a footer button that opens a confirm modal with a negative-
// adjustment ReasonSelect, setting countedNumberOfPacks = 0 on every selected line. The server
// enforces whether a reason is required; an unmet requirement comes back as failed lines and lands
// the modal on its error phase (→ Show error lines).
//
// The confirm → working → success | error dialog is written inline (not via a shared
// SelectionActionModal) so the whole flow — mutation, phase transitions, what each phase renders —
// is readable in one place (kdd/explicit-composition). The phase state lives in <Body>, mounted
// only while open, so it's fresh on every open by construction (no manual reset) and a late-
// resolving run() from a prior open lands on a disposed scope (its setState is a no-op).
export const ReduceToZeroAction: Component<ReduceToZeroActionProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<MinusCircleIcon />}
        disabled={props.disabled}
        onClick={() => setOpen(true)}
      >
        {t('stocktake.lines.reduce-to-zero')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

// confirm → working → success | error. The error branch carries its own message + lineIds, so they
// can't drift out of sync with the phase (no empty Alert, no stale ids).
type State =
  | { phase: 'confirm' }
  | { phase: 'working' }
  | { phase: 'success' }
  | { phase: 'error'; message: string; lineIds: string[] };

const Body = (props: ReduceToZeroActionProps & { onClose: () => void }) => {
  const [reasonId, setReasonId] = createSignal<string | null>(null);
  const [state, setState] = createSignal<State>({ phase: 'confirm' });
  const phase = () => state().phase;

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard: don't fire the mutation twice on double-click
    setState({ phase: 'working' });
    const outcome = await runBatchStocktakeLines(props.storeId, {
      update: props.selectedIds().map((id) => ({ id, countedNumberOfPacks: 0, reasonOptionId: reasonId() })),
    });
    // Transport / NodeError → the global modal already showed it; just close (no stuck loading).
    if (!outcome) {
      props.onClose();
      return;
    }
    props.onCommit(outcome.commit);
    props.onErrors(outcome.errors);
    if (outcome.errors.size === 0) {
      setState({ phase: 'success' });
    } else {
      const lineIds = [...outcome.errors.keys()];
      setState({ phase: 'error', message: tPlural('stocktake.errors.summary', lineIds.length), lineIds });
    }
  };

  return (
    <Dialog
      open
      dismissable={phase() !== 'working'}
      onClose={props.onClose}
      icon={<MinusCircleIcon />}
      title={t('stocktake.lines.reduce-to-zero-title')}
      description={
        <>
          {/* confirm / working both show the question + reason picker (working just disables exit
              and spins the Apply button); success and error swap in their own body. */}
          <Show when={phase() === 'confirm' || phase() === 'working'}>
            <p>{t('stocktake.lines.reduce-to-zero-message')}</p>
            <FieldRow label={t('stocktake.line-edit.reason')}>
              <ReasonSelect
                kind="reduction"
                label={t('stocktake.line-edit.reason')}
                hideLabel
                value={reasonId() ?? undefined}
                placeholder={t('stocktake.line-edit.reason-select')}
                onChange={(r) => setReasonId(r?.id ?? null)}
              />
            </FieldRow>
          </Show>
          <Show when={phase() === 'success'}>{t('stocktake.lines.reduce-to-zero-success')}</Show>
          <Show when={errorState(state())} keyed>
            {err => <Alert severity="error">{err.message}</Alert>}
          </Show>
        </>
      }
      actions={
        <>
          {/* Cancel is the dismiss button — shown whenever the user can back out (confirm, error),
              hidden while working (no exit mid-mutation) and on success (OK dismisses instead). */}
          <Show when={phase() === 'confirm' || phase() === 'error'}>
            <Button variant="secondary" icon={<XCircleIcon />} onClick={props.onClose}>
              {t('common.cancel')}
            </Button>
          </Show>

          {/* The primary action is per-phase: confirm/working → Apply (spins while working);
              success → OK; error → jump to the offending lines (only when there are some). */}
          <Show when={phase() === 'confirm' || phase() === 'working'}>
            <Button
              variant="primary"
              icon={<CheckIcon />}
              loading={phase() === 'working'}
              onClick={() => void run()}
            >
              {t('common.apply')}
            </Button>
          </Show>
          <Show when={phase() === 'success'}>
            <Button variant="secondary" icon={<CheckIcon />} onClick={props.onClose}>
              {t('common.ok')}
            </Button>
          </Show>
          <Show when={errorState(state())} keyed>
            {err => (
              <Show when={err.lineIds.length > 0}>
                <Button
                  variant="primary"
                  icon={<SearchIcon />}
                  onClick={() => {
                    // Capture ids before closing (unmount disposes the state) — order matters.
                    const ids = err.lineIds;
                    props.onClose();
                    props.onShowErrors(ids);
                  }}
                >
                  {t('stocktake.errors.show')}
                </Button>
              </Show>
            )}
          </Show>
        </>
      }
    />
  );
};

// Narrow the state to its error branch (or undefined), so the error <Match> reads message + lineIds
// off one keyed value rather than re-deriving them with optional chaining.
const errorState = (s: State): Extract<State, { phase: 'error' }> | undefined =>
  s.phase === 'error' ? s : undefined;
