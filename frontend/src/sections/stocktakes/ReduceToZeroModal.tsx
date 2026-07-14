import { createSignal, type Component } from 'solid-js';
import { t } from '../../intl';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Button } from '../../ui/elements/buttons/Button';
import { FieldRow } from '../../ui/elements/inputs/FieldRow';
import { CheckIcon, XCircleIcon } from '../../ui/icons';
import { ReasonSelect } from '../../domain/reasonOptions';

// Reduce-to-0 selection action (OMS): set the counted quantity of every selected line to 0. Since
// that's an inventory reduction, an adjustment reason is offered (a negative-adjustment reason) —
// like OMS, which requires it when the store's reason options include one. We surface the picker
// (ReasonSelect kind="reduction") and pass the chosen reason id on; the server enforces whether
// it's mandatory (an unmet requirement comes back as AdjustmentReasonNotProvided → the error
// dialog), so we don't pre-validate here.

export interface ReduceToZeroModalProps {
  open: boolean;
  onClose: () => void;
  /** Apply the reduction with the chosen reason id (or null) to the selected lines. */
  onConfirm: (reasonOptionId: string | null) => void;
}

export const ReduceToZeroModal: Component<ReduceToZeroModalProps> = (props) => {
  const [reasonId, setReasonId] = createSignal<string | null>(null);

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={t('stocktake.lines.reduce-to-zero-title')}
      description={t('stocktake.lines.reduce-to-zero-message')}
      actions={
        <>
          <Button variant="secondary" icon={<XCircleIcon />} onClick={props.onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            icon={<CheckIcon />}
            onClick={() => {
              props.onConfirm(reasonId());
              props.onClose();
            }}
          >
            {t('common.apply')}
          </Button>
        </>
      }
    >
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
    </Dialog>
  );
};
