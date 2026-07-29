import { generateUUID } from '../../../uuid';
import { createSignal, Show, type JSX } from 'solid-js';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { TextArea } from '../../../ui/elements/inputs/TextArea';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { VvmStatusSelect } from '../../../domain/vvmStatus';
import { XCircleIcon, CheckIcon } from '../../../ui/icons';
import { runInsertVvmStatusLog, runUpdateVvmStatusLog } from '../stockApi';
import type { StockLineVvmLogFragment } from './stockLine.generated';

// The VVM status entry modal (spec/stock S6, FL7). Create: choose an active VVM
// status + optional comment — appends a history entry AND stamps the line's
// current status. Edit: the status is FIXED (spec/stock rules › VVM two write
// paths); only the comment is editable. Follows the shared dialog lifecycle.

export interface VvmStatusEntryModalProps {
  open: boolean;
  storeId: string;
  stockLineId: string;
  /** The entry being edited (comment-only); undefined = create a new entry. */
  entry?: StockLineVvmLogFragment;
  onClose: () => void;
  onSaved: () => void;
}

export const VvmStatusEntryModal = (
  props: VvmStatusEntryModalProps
): JSX.Element => (
  <Show when={props.open} keyed>
    <VvmStatusEntryContent
      storeId={props.storeId}
      stockLineId={props.stockLineId}
      entry={props.entry}
      onClose={props.onClose}
      onSaved={props.onSaved}
    />
  </Show>
);

const VvmStatusEntryContent = (props: {
  storeId: string;
  stockLineId: string;
  entry?: StockLineVvmLogFragment;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element => {
  const editing = () => props.entry !== undefined;
  const [statusId, setStatusId] = createSignal<string | undefined>(
    props.entry?.status?.id
  );
  const [comment, setComment] = createSignal(props.entry?.comment ?? '');
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | undefined>();

  const canConfirm = () => (editing() || !!statusId()) && !saving();

  const onOk = async () => {
    if (!canConfirm()) return;
    setSaving(true);
    setError(undefined);
    const outcome = editing()
      ? await runUpdateVvmStatusLog(props.storeId, {
          id: props.entry!.id,
          comment: comment() || null,
        })
      : await runInsertVvmStatusLog(props.storeId, {
          id: generateUUID(),
          statusId: statusId() as string,
          stockLineId: props.stockLineId,
          comment: comment() || null,
        });
    setSaving(false);
    if (!outcome) return;
    if (outcome.kind === 'error') {
      setError(outcome.message);
      return;
    }
    props.onSaved();
    props.onClose();
  };

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      widthRem={28}
      testId="vvm-status-modal"
      title={editing() ? t('label.edit-vvm-status') : t('label.new-vvm-status')}
      actionsLead={
        <Show when={error()}>
          {message => <Alert severity="error">{message()}</Alert>}
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            disabled={saving()}
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          <Button
            icon={<CheckIcon />}
            loading={saving()}
            disabled={!canConfirm()}
            data-testid="dialog-button-ok"
            onClick={() => void onOk()}
          >
            {t('button.ok')}
          </Button>
        </>
      }
    >
      <div
        style={{
          display: 'flex',
          'flex-direction': 'column',
          gap: 'var(--space-3)',
        }}
      >
        <FieldRow label={t('label.vvm-status')}>
          {/* On edit the status is fixed: show it read-only. */}
          <Show
            when={!editing()}
            fallback={<span>{props.entry?.status?.description ?? ''}</span>}
          >
            <VvmStatusSelect
              label={t('label.vvm-status')}
              inputTestId="vvm-status-select"
              hideLabel
              value={statusId()}
              placeholder={t('label.select')}
              onChange={s => setStatusId(s?.id)}
            />
          </Show>
        </FieldRow>
        <FieldRow label={t('label.comment')}>
          <TextArea
            label={t('label.comment')}
            data-testid="vvm-comment"
            hideLabel
            value={comment()}
            onInput={e => setComment(e.currentTarget.value)}
          />
        </FieldRow>
      </div>
    </Dialog>
  );
};
