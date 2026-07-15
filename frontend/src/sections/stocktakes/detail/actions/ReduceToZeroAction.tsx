import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Button } from '../../../../ui/elements/buttons/Button';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import { CheckIcon, MinusCircleIcon, XCircleIcon } from '../../../../ui/icons';
import { ReasonSelect } from '../../../../domain/reasonOptions';
import { runBatchStocktakeLines, type LineEditCommit } from '../lines/stocktakeLineUpdate';
import type { LineErrors } from '../lines/stocktakeLineErrors';

export interface ReduceToZeroActionProps {
  storeId: string;
  selectedIds: () => string[];
  disabled: boolean;
  /** Apply what committed in place (no refetch). */
  onCommit: (commit: LineEditCommit) => void;
  /** Partial failure — stamp the per-line errors (lineId → typename) and jump to those rows. */
  onError: (errors: LineErrors) => void;
}

// The Reduce-to-0 selection action: its footer button + a confirm modal with a negative-adjustment
// ReasonSelect, setting countedNumberOfPacks = 0 on every selected line. The server enforces whether
// a reason is required.
//
// The confirm → working dialog is written inline (not via a shared ActionModal) so the whole flow —
// mutation, the two-phase transition, what each phase renders — is readable in one place
// (kdd/explicit-composition). On resolution the modal always closes: what committed splices in via
// onCommit, and any failed lines surface on the detail rows via onError (which stamps them + jumps
// to them) — there's no in-modal error phase / "show errors" button, matching the line-edit modal.
// The phase lives in <Body>, mounted only while open, so it's fresh on every open and a late-
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

const Body = (props: ReduceToZeroActionProps & { onClose: () => void }) => {
  const [reasonId, setReasonId] = createSignal<string | null>(null);
  const [working, setWorking] = createSignal(false);

  const run = async () => {
    if (working()) return; // re-entry guard: don't fire the mutation twice on double-click
    setWorking(true);
    const outcome = await runBatchStocktakeLines(props.storeId, {
      update: props.selectedIds().map((id) => ({ id, countedNumberOfPacks: 0, reasonOptionId: reasonId() })),
    });
    // Transport / NodeError → outcome undefined (the global modal already showed it). Otherwise
    // splice what committed and, if any lines failed, surface them on the rows.
    if (outcome) {
      props.onCommit(outcome.commit);
      if (outcome.errors.size > 0) props.onError(outcome.errors);
    }
    props.onClose();
  };

  return (
    <Dialog
      open
      dismissable={!working()}
      onClose={props.onClose}
      icon={<MinusCircleIcon />}
      title={t('stocktake.lines.reduce-to-zero-title')}
      description={
        <>
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
        </>
      }
      actions={
        <>
          {/* Cancel is hidden while working (no exit mid-mutation); Apply spins in its place. */}
          <Show when={!working()}>
            <Button variant="secondary" icon={<XCircleIcon />} onClick={props.onClose}>
              {t('common.cancel')}
            </Button>
          </Show>
          <Button variant="primary" icon={<CheckIcon />} loading={working()} onClick={() => void run()}>
            {t('common.apply')}
          </Button>
        </>
      }
    />
  );
};
