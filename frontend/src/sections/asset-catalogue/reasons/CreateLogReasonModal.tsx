import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch, reportPermissionDenied } from '@/api/graphql';
import { generateUUID } from '@/uuid';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import {
  CancelButton,
  DialogSaveButton,
} from '@/ui/elements/buttons/StandardButtons';
import { TextField } from '@/ui/elements/inputs/TextField';
import { Checkbox } from '@/ui/elements/inputs/Checkbox';
import { Select } from '@/ui/elements/selectors/Select';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import { PlusCircleIcon } from '@/ui/icons';
import { InsertAssetLogReason } from './logReasons.generated';
import {
  emptyDraft,
  isReasonMissing,
  statusOptions,
  STATUSES,
  toReasonInput,
  type ReasonDraft,
} from './logReasons';
import { outcomeOf } from '../refusals';

// Create log reason (spec/asset-catalogue S4): reason text, status, comments
// required. OK stays disabled while the text is blank or only spaces; a
// successful create closes the modal (closure is the confirmation), a refused
// one keeps it open with the entry intact and the server's message inside
// (ui-standards/controls § dialogs).

export interface CreateLogReasonModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export const CreateLogReasonModal: Component<
  CreateLogReasonModalProps
> = props => {
  const [draft, setDraft] = createSignal<ReasonDraft>(emptyDraft());
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string>();
  // One id per open: a double-submit of the same draft is then refused by the
  // server as already existing rather than creating a second reason.
  const id = generateUUID();
  const reasonField = createFocusTarget();

  const update = (patch: Partial<ReasonDraft>) =>
    setDraft({ ...draft(), ...patch });

  const create = async () => {
    if (saving() || isReasonMissing(draft())) return;
    setSaving(true);
    setError(undefined);
    const outcome = outcomeOf(
      await graphqlFetch(
        InsertAssetLogReason,
        { input: toReasonInput(draft(), id) },
        { returnGraphqlErrors: true }
      )
    );
    setSaving(false);
    switch (outcome.kind) {
      case 'done':
        props.onClose();
        props.onCreated();
        return;
      case 'refused':
        setError(outcome.reason);
        return;
      case 'forbidden':
        reportPermissionDenied(outcome.permissions);
        return;
      case 'failed':
        return;
    }
  };

  return (
    <Dialog
      open
      width="prose"
      onClose={props.onClose}
      dismissable={!saving()}
      icon={<PlusCircleIcon />}
      title={t('label.create-log-reason')}
      testId="create-log-reason-modal"
      initialFocus={reasonField}
      actions={
        <>
          <Show when={!saving()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          <DialogSaveButton
            data-testid="dialog-button-save"
            disabled={isReasonMissing(draft())}
            loading={saving()}
            onClick={() => void create()}
          />
        </>
      }
    >
      <Show when={error()}>
        {message => (
          <Alert severity="error" testId="create-log-reason-error">
            {message()}
          </Alert>
        )}
      </Show>
      <TextField
        label={t('label.reason')}
        required
        value={draft().reason}
        ref={el => reasonField.ref(el)}
        data-testid="log-reason-text-input"
        onInput={e => update({ reason: e.currentTarget.value })}
      />
      <Select
        label={t('label.status')}
        options={statusOptions()}
        value={draft().status}
        testId="log-reason-status-select"
        onValueChange={value => {
          const status = STATUSES.find(s => s === value);
          if (status) update({ status });
        }}
      />
      <Checkbox
        label={t('label.comments-required')}
        checked={draft().commentsRequired}
        testId="log-reason-comments-required"
        onChange={checked => update({ commentsRequired: checked })}
      />
    </Dialog>
  );
};
