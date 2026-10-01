import { createSignal, Show } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { rejectionFrom, type Rejection } from '@/api/rejection';
import { formatFileSize, t } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { UploadZone } from '@/ui/elements/inputs/UploadZone';
import type { FileRejection } from '@/ui/elements/inputs/uploadFiles';
import { HStack } from '@/ui/layout/Stack/HStack';
import { Stack } from '@/ui/layout/Stack/Stack';
import { CloseIcon, FileIcon } from '@/ui/icons';
import { InstallUploadedPlugin } from './plugins.generated';
import {
  BUNDLE_ACCEPT,
  chooseBundle,
  MAX_BUNDLE_BYTES,
  uploadBundle,
} from './bundleFile';
import { RefusalAlert } from './RefusalAlert';

/*
 * S2 — Upload dialog (spec/plugin-management/ui-surface.md): install ONE
 * bundle file. Upload then install, seen by the user as one step; the dialog
 * holds until the outcome is known (rules › installing a bundle).
 *
 * Mounted only while open (the list gates it), so every open starts with no
 * file chosen and no notice.
 */

type Notice =
  | { kind: 'refused'; rejection: FileRejection<File> }
  | { kind: 'upload'; status: string }
  | { kind: 'install'; rejection: Rejection };

export const UploadPluginDialog = (props: {
  onClose: () => void;
  /** An install was attempted — the list reads again, whatever the outcome. */
  onAttempted: () => void;
}) => {
  const [file, setFile] = createSignal<File>();
  const [notice, setNotice] = createSignal<Notice>();
  const [running, setRunning] = createSignal(false);

  // The upload zone reports one pick or drop as two calls — refused files,
  // then accepted ones — synchronously. They are gathered into ONE batch and
  // decided once, because a drop of several files chooses none whatever they
  // are (rules › installing a bundle), which neither call can tell alone.
  let batch: { accepted: File[]; rejected: FileRejection<File>[] } | undefined;
  const gather = (accepted: File[], rejected: FileRejection<File>[]): void => {
    if (!batch) {
      batch = { accepted: [], rejected: [] };
      queueMicrotask(() => {
        const current = batch;
        batch = undefined;
        if (!current) return;
        const choice = chooseBundle(current.accepted, current.rejected);
        if (choice.kind === 'chosen') {
          setFile(choice.file);
          setNotice(undefined);
        } else if (choice.kind === 'refused') {
          // The chosen file, if any, stays (AC-I2).
          setNotice({ kind: 'refused', rejection: choice.rejection });
        }
      });
    }
    batch.accepted.push(...accepted);
    batch.rejected.push(...rejected);
  };

  const install = async () => {
    const chosen = file();
    if (!chosen || running()) return;
    setRunning(true);
    setNotice(undefined);
    const uploaded = await uploadBundle(chosen);
    if (!uploaded.ok) {
      setNotice({ kind: 'upload', status: uploaded.status });
      setRunning(false);
      return;
    }
    const result = await graphqlFetch(
      InstallUploadedPlugin,
      { fileId: uploaded.fileId },
      { returnGraphqlErrors: true }
    );
    props.onAttempted();
    if (result.kind === 'success') {
      // Closing is the confirmation; the list's new rows are the result
      // (ui-standards › controls § dialogs).
      props.onClose();
      return;
    }
    if (result.kind === 'graphqlError') {
      setNotice({
        kind: 'install',
        rejection: rejectionFrom(result.errors, ''),
      });
    }
    // Any other failure surfaced globally; release the busy state either way.
    setRunning(false);
  };

  const refusalText = (rejection: FileRejection<File>): string =>
    rejection.reason === 'size'
      ? t('error.file-exceeds-size-limit', {
          filename: rejection.file.name,
          maxSize: formatFileSize(MAX_BUNDLE_BYTES),
        })
      : t('error.plugin-invalid-file');

  return (
    <Dialog
      open
      onClose={props.onClose}
      // Blocking while the upload and install run: the outcome is reported in
      // this dialog, so it cannot be dismissed from under it (AC-I12).
      dismissable={!running()}
      title={t('title.upload-plugin')}
      width="prose"
      testId="upload-plugin-dialog"
      actions={
        <>
          <Show when={!running()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          <Button
            variant="primary"
            confirms="plain"
            data-testid="dialog-button-ok"
            disabled={!file()}
            loading={running()}
            onClick={() => void install()}
          >
            {t('button.upload-plugin')}
          </Button>
        </>
      }
    >
      <Stack gap="md">
        <p>{t('messages.plugin-upload-helper')}</p>
        <UploadZone
          accept={BUNDLE_ACCEPT}
          maxSize={MAX_BUNDLE_BYTES}
          multiple={false}
          disabled={running()}
          inputTestId="upload-plugin-file-input"
          onFiles={files => gather(files, [])}
          onRejected={rejected => gather([], rejected)}
        />
        <Show when={file()}>
          {chosen => (
            <HStack gap="sm" align="center">
              <FileIcon />
              <span data-testid="upload-plugin-chosen-file">
                {chosen().name}
              </span>
              <IconButton
                icon={<CloseIcon />}
                label={t('button.remove-file')}
                disabled={running()}
                data-testid="upload-plugin-remove-file"
                onClick={() => setFile(undefined)}
              />
            </HStack>
          )}
        </Show>
        {/* Keyed: each notice is its own object, so a second refusal of
            another kind re-renders rather than keeping the first one's body. */}
        <Show when={notice()} keyed>
          {value => {
            if (value.kind === 'refused')
              return (
                <Alert severity="error">
                  <span data-testid="upload-plugin-error">
                    {refusalText(value.rejection)}
                  </span>
                </Alert>
              );
            if (value.kind === 'upload')
              return (
                <RefusalAlert
                  step={t('error.unable-to-upload-plugin')}
                  rejection={{ message: value.status }}
                  testId="upload-plugin-error"
                />
              );
            return (
              <RefusalAlert
                step={t('error.unable-to-install-plugin')}
                rejection={value.rejection}
                testId="upload-plugin-error"
              />
            );
          }}
        </Show>
      </Stack>
    </Dialog>
  );
};
