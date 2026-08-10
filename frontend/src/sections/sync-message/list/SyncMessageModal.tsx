import { createResource, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { StatusChip } from '@/ui/elements/feedback/StatusChip';
import { Table } from '@/ui/elements/table/Table';
import { FormRow } from '@/ui/layout/Form/FormRow';
import { Stack } from '@/ui/layout/Stack/Stack';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { Text } from '@/ui/elements/typography/Text';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { FileIcon } from '@/ui/icons';
import { syncFileUrl } from '@/domain/syncFiles';
import { SyncMessageFiles } from './syncMessages.generated';
import type {
  SyncMessageFileFragment,
  SyncMessageRowFragment,
} from './syncMessages.generated';
import {
  SYNC_MESSAGE_TABLE,
  fileErrorNotice,
  filesInNameOrder,
  messageErrorNotice,
  showFilesSection,
} from './messageFiles';
import {
  fileStatusColour,
  fileStatusLabel,
  statusLabel,
  typeLabel,
} from './syncMessageLabels';

/*
 * S3 — the message modal (spec/sync-message/ui-surface.md S3): inspect one
 * message — who asked whom for what, how it went, and which artefacts it
 * produced.
 *
 * WHOLLY READ-ONLY (rules § immutability): nothing here can be edited,
 * retried or deleted, every field is a read-only labelled value rather than a
 * disabled input (D67), and the only action closes it. An unset field shows a
 * dash.
 */

const DASH = '-';

export interface SyncMessageModalProps {
  storeId: string;
  /** The clicked register row — every field but the attached files is already
   *  on it, so the modal shows its content immediately. */
  message: SyncMessageRowFragment;
  onClose: () => void;
}

export const SyncMessageModal: Component<SyncMessageModalProps> = props => {
  /*
   * The message's attached files, read by id (contract § contract surface).
   * This resource first fetches on an INTERACTION — the row click that opened
   * this modal — under the already-open register's <Suspense> boundary, so it
   * MUST be read non-suspending: a suspending read would remount everything
   * inside that boundary and detach this open <dialog>, taking its modal
   * backdrop with it (kdd/solid-reactivity-pitfalls § no remounts on
   * interaction). Hence the `.state` gate below — `.latest` alone is not safe,
   * since it suspends on the first pending read.
   */
  const [filesData] = createResource(
    // Both variables come from the SOURCE, so the fetcher reads no props of
    // its own (solid/reactivity): it re-runs exactly when the message or the
    // active store changes, and never on an unrelated re-render.
    () => ({ storeId: props.storeId, id: props.message.id }),
    async ({ storeId, id }) => {
      const result = await graphqlFetch(SyncMessageFiles, { storeId, id });
      if (result.kind !== 'success') return [];
      // SyncMessageResponse is SyncMessageNode | RecordNotFound, so a vanished
      // id resolves to a branch carrying no files at all — read defensively.
      return (
        result.data.centralServer.syncMessage.syncMessage.files?.nodes ?? []
      );
    }
  );

  const files = (): SyncMessageFileFragment[] =>
    filesData.state === 'ready' || filesData.state === 'refreshing'
      ? filesInNameOrder(filesData.latest ?? [])
      : [];

  const errorNotice = () => messageErrorNotice(props.message);

  return (
    <Dialog
      open
      testId="sync-message-modal"
      title={t('title.message')}
      width="form"
      onClose={props.onClose}
      // Close is the only action — there is nothing to save.
      actions={
        <CancelButton
          data-testid="dialog-button-cancel"
          onClick={props.onClose}
        />
      }
    >
      {/* 1 — parties and classification, as two pairs side by side. */}
      <FormRow>
        <Stack gap="sm">
          <LabelledValue
            label={t('label.from')}
            data-testid="sync-message-from"
          >
            {props.message.fromStore?.storeName ?? DASH}
          </LabelledValue>
          <LabelledValue label={t('label.to')} data-testid="sync-message-to">
            {props.message.toStore?.storeName ?? DASH}
          </LabelledValue>
        </Stack>
        <Stack gap="sm">
          <LabelledValue
            label={t('label.status')}
            data-testid="sync-message-status"
          >
            {statusLabel(props.message.status)}
          </LabelledValue>
          <LabelledValue
            label={t('label.type')}
            data-testid="sync-message-type"
          >
            {typeLabel(props.message.type)}
          </LabelledValue>
        </Stack>
      </FormRow>

      {/* 2 — the body as recorded, multi-line. */}
      <LabelledValue
        label={t('label.sync-message-body')}
        data-testid="sync-message-body"
        style={{ 'white-space': 'pre-wrap' }}
      >
        {props.message.body || DASH}
      </LabelledValue>

      {/* 3 — the recorded processing failure. Not an app error: it is DATA,
          and the raw server string is shown verbatim, never translated. */}
      <Show when={errorNotice()}>
        {reason => (
          <Alert severity="error" testId="sync-message-error">
            {reason()}
          </Alert>
        )}
      </Show>

      {/* 4 — the Files section, only for a kind that produces artefacts and
          only when at least one exists: the section's PRESENCE is itself the
          signal that artefacts exist (OMS-REG-MNG-04.20). A short, fixed row
          set inside another surface, so it is the static sub-table, not the
          data table. */}
      <Show when={showFilesSection(props.message.type, files())}>
        <Stack gap="sm">
          <Text variant="subtitle" as="h3">
            {t('label.files')}
          </Text>
          <Table label={t('label.files')}>
            <tbody>
              <For each={files()}>
                {file => (
                  <tr data-testid="sync-message-file-row">
                    <td>
                      <FileIcon aria-hidden="true" />{' '}
                      {/* Fetched from the server over plain HTTP, not from
                          within the register's own data, and opened in a new
                          context (contract § attached files). */}
                      <a
                        href={syncFileUrl(
                          SYNC_MESSAGE_TABLE,
                          props.message.id,
                          file.id
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {file.fileName}
                      </a>
                      {/* The file's OWN failure reason, where it has one —
                          the only place a per-artefact failure is visible; the
                          message's own status does not reflect it
                          (OMS-REG-MNG-04.23). */}
                      <Show when={fileErrorNotice(file)}>
                        {reason => (
                          <Text
                            variant="bodySmall"
                            data-testid="sync-message-file-error"
                          >
                            {reason()}
                          </Text>
                        )}
                      </Show>
                    </td>
                    <td>
                      {/* The file's own transfer state — a SECOND status
                          vocabulary, never in the same column or row as the
                          message's own (ui-surface § cross-cutting). Label
                          plus treatment, never colour alone. */}
                      <StatusChip
                        label={fileStatusLabel(file.status)}
                        colour={fileStatusColour(file.status)}
                      />
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </Table>
        </Stack>
      </Show>
    </Dialog>
  );
};
