import { createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { t } from '@/intl';
import { generateUUID } from '@/uuid';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { CancelButton, OkButton } from '@/ui/elements/buttons/StandardButtons';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import { UploadZone } from '@/ui/elements/inputs/UploadZone';
import { Combobox } from '@/ui/elements/selectors/Combobox';
import { Stack } from '@/ui/layout/Stack/Stack';
import { Text } from '@/ui/elements/typography/Text';
import { uploadSyncFiles } from '@/domain/syncFiles';
import { ASSET_STATUSES, statusLabelKey, type AssetStatus } from '../equipment';
import { AssetLogReasonsList, InsertAssetLog } from '../equipment.generated';
import {
  buildStatusLogInput,
  canSubmitStatus,
  commentRequired,
  emptyStatusForm,
  reasonsForStatus,
  withStatus,
  type LogReason,
  type StatusFormState,
} from './statusLog';

// S5 — the Update status modal (ui-surface S5). Records what condition the
// machine is in, why, and with what evidence.
//
// The modal carries NO date control: an entry recorded here is dated now.
// Backdating is reachable only through the wire (ui-surface S5).

export interface UpdateStatusModalProps {
  storeId: string;
  assetId: string;
  onClose: () => void;
  /** An entry was recorded — the detail screen re-reads the asset. */
  onRecorded: () => void;
}

export const UpdateStatusModal: Component<UpdateStatusModalProps> = props => {
  const [form, setForm] = createSignal<StatusFormState>(emptyStatusForm());
  const [saving, setSaving] = createSignal(false);
  const statusField = createFocusTarget();

  /*
   * The reasons configured for the chosen status. Read per status, and
   * non-suspending — this modal renders under an already-open screen's
   * boundary, and a pending read would remount it and reset the form
   * (kdd/solid-reactivity-pitfalls § no remounts).
   */
  const [reasonData] = createResource(
    () => form().status || null,
    async status => {
      const result = await graphqlFetch(AssetLogReasonsList, {
        storeId: props.storeId,
        filter: { assetLogStatus: { equalTo: status } },
      });
      return result.kind === 'success'
        ? result.data.assetLogReasons.nodes
        : undefined;
    }
  );
  const reasons = (): LogReason[] =>
    reasonsForStatus(gated(reasonData) ?? [], form().status);

  const statuses = () => [...ASSET_STATUSES];

  const save = async () => {
    if (saving() || !canSubmitStatus(form(), reasons())) return;
    setSaving(true);
    const logId = generateUUID();
    const result = await graphqlFetch(InsertAssetLog, {
      storeId: props.storeId,
      input: buildStatusLogInput(form(), props.assetId, logId),
    });
    if (result.kind !== 'success') {
      setSaving(false);
      // Untyped rejection — the global error path has already surfaced it
      // (contract › the error union). Stay open so the entry isn't lost.
      return;
    }
    // The entry's files upload AFTER it saves, keyed on the new entry's id: a
    // log that saves and an upload that fails leaves the entry with no files
    // (contract › documents).
    if (form().files.length > 0) {
      await uploadSyncFiles('asset_log', logId, form().files);
    }
    setSaving(false);
    props.onRecorded();
    props.onClose();
  };

  return (
    <Dialog
      open
      initialFocus={statusField}
      testId="update-status-modal"
      title={t('button.update-status')}
      dismissable={!saving()}
      onClose={props.onClose}
      // Room for the status picker's open listbox: it sits at the top with two
      // rows and the upload zone below it.
      minBodyHeightRem={28}
      actions={
        <>
          <Show when={!saving()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          {/* Inert until a status is chosen, and while a required reason or
              required observations are missing (AC-FS2/AC-FS5/AC-FS7). */}
          <OkButton
            data-testid="dialog-button-ok"
            loading={saving()}
            disabled={!canSubmitStatus(form(), reasons()) || saving()}
            onClick={() => void save()}
          />
        </>
      }
    >
      <FieldRow label={t('label.new-functional-status')} required>
        <Combobox<AssetStatus>
          label={t('label.new-functional-status')}
          hideLabel
          required
          focusTarget={statusField}
          inputTestId="status-input"
          disabled={saving()}
          items={statuses()}
          itemToString={status => t(statusLabelKey(status))}
          itemToValue={status => status}
          value={form().status || undefined}
          // Choosing a status clears any reason already picked — a reason
          // belongs to one status (AC-FS4).
          onChange={status => setForm(withStatus(form(), status ?? ''))}
        />
      </FieldRow>
      <FieldRow
        label={t('label.reason')}
        required={form().status === 'NOT_FUNCTIONING'}
      >
        <Combobox<LogReason>
          label={t('label.reason')}
          hideLabel
          clearable
          inputTestId="reason-input"
          // Inert while the chosen status has no reasons configured (AC-FS3).
          disabled={saving() || reasons().length === 0}
          items={reasons()}
          itemToString={reason => reason.reason}
          itemToValue={reason => reason.id}
          value={form().reasonId || undefined}
          onChange={reason =>
            setForm({ ...form(), reasonId: reason?.id ?? '' })
          }
        />
      </FieldRow>
      <FieldRow
        label={t('label.observations')}
        required={commentRequired(form(), reasons())}
        align="first-line"
      >
        <TextArea
          label={t('label.observations')}
          hideLabel
          rows={4}
          data-testid="observations-input"
          required={commentRequired(form(), reasons())}
          disabled={saving()}
          value={form().comment}
          onInput={e => setForm({ ...form(), comment: e.currentTarget.value })}
        />
      </FieldRow>
      <Stack>
        <UploadZone
          inputTestId="status-files-input"
          disabled={saving()}
          onFiles={files => setForm({ ...form(), files })}
        />
        <Show when={form().files.length > 0}>
          <Text variant="bodySmall">
            {form()
              .files.map(file => file.name)
              .join(', ')}
          </Text>
        </Show>
      </Stack>
    </Dialog>
  );
};
