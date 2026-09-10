import { createResource, createSignal, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { formatFileSize, t } from '@/intl';
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
import { Alert } from '@/ui/elements/feedback/Alert';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { TrashIcon } from '@/ui/icons';
import { HStack } from '@/ui/layout/Stack/HStack';
import type { FileRejection } from '@/ui/elements/inputs/uploadFiles';
import { uploadSyncFiles } from '@/domain/syncFiles';
import {
  ACCEPT,
  batchTooLarge,
  describeRejections,
  MAX_BATCH_BYTES,
  MAX_FILE_BYTES,
} from './documentUploads';
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
  // A file the user picked that this vertical will not take, and — separately —
  // an upload that failed after the entry had already saved.
  const [fileError, setFileError] = createSignal<string>();
  const [uploadError, setUploadError] = createSignal<string>();
  // The entry reached the server. Nothing may submit twice after that.
  const [recorded, setRecorded] = createSignal(false);
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

  /*
   * Files ACCUMULATE. UploadZone hands over only the batch just picked, so
   * assigning it would drop everything chosen before — a user attaching two
   * inspection photos one at a time would silently keep only the second.
   * A batch that takes the entry over the per-request cap is refused whole.
   */
  const addFiles = (picked: File[]) => {
    setFileError(undefined);
    const next = [...form().files, ...picked];
    if (batchTooLarge(next)) {
      setFileError(
        t('error.upload-too-large', {
          maxSize: formatFileSize(MAX_BATCH_BYTES),
        })
      );
      return;
    }
    setForm({ ...form(), files: next });
  };

  const removeFile = (file: File) => {
    setFileError(undefined);
    setForm({ ...form(), files: form().files.filter(each => each !== file) });
  };

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
    // log that saves and an upload that fails leaves the entry with no files,
    // and MUST report the upload's error (contract › documents).
    if (form().files.length > 0) {
      const uploaded = await uploadSyncFiles('asset_log', logId, form().files);
      if (!uploaded.ok) {
        // The ENTRY is recorded; only its evidence is missing. Closing here
        // would claim the files were attached, and re-submitting would record
        // the entry a second time — so the modal stays open saying what
        // happened, with nothing left to do but close.
        setSaving(false);
        setRecorded(true);
        setUploadError(uploaded.message);
        props.onRecorded();
        return;
      }
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
      actionsLead={
        <Show when={uploadError() ?? fileError()}>
          {message => <Alert severity="error">{message()}</Alert>}
        </Show>
      }
      actions={
        <Show
          when={!recorded()}
          fallback={
            <OkButton data-testid="dialog-button-ok" onClick={props.onClose} />
          }
        >
          <Show when={!saving()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          {/* Inert until a status is chosen, and while a required reason or
              required observations are missing (OMS-REG-CCE-06.19/.22/OMS-REG-CCE-06.24). */}
          <OkButton
            data-testid="dialog-button-ok"
            loading={saving()}
            disabled={!canSubmitStatus(form(), reasons()) || saving()}
            onClick={() => void save()}
          />
        </Show>
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
          // belongs to one status (OMS-REG-CCE-06.21).
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
          // Inert while the chosen status has no reasons configured (OMS-REG-CCE-06.20).
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
          disabled={saving() || recorded()}
          // The same accepted types and the same caps as the asset's own
          // documents — one rule for attaching a file to this machine, wherever
          // the user does it (rules › documents).
          accept={ACCEPT}
          maxSize={MAX_FILE_BYTES}
          onFiles={addFiles}
          onRejected={(rejections: FileRejection<File>[]) =>
            setFileError(describeRejections(rejections))
          }
        />
        {/* Each pick listed and removable: a user attaching two photos one at
            a time must keep both, and be able to drop the wrong one without
            starting the entry over (ui-surface S5). */}
        <Stack>
          <For each={form().files}>
            {file => (
              <HStack gap="sm" align="center">
                <Text variant="bodySmall">{file.name}</Text>
                <IconButton
                  icon={<TrashIcon />}
                  label={t('button.remove-file')}
                  variant="danger"
                  size="small"
                  disabled={saving() || recorded()}
                  onClick={() => removeFile(file)}
                />
              </HStack>
            )}
          </For>
        </Stack>
      </Stack>
    </Dialog>
  );
};
