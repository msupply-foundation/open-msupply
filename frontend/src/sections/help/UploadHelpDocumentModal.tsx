import { generateUUID } from '../../uuid';
import { createSignal, Show, type Component } from 'solid-js';
import { graphqlFetch } from '../../api/graphql';
import { t } from '../../intl';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { Button } from '../../ui/elements/buttons/Button';
import { TextField } from '../../ui/elements/inputs/TextField';
import { UploadZone } from '../../ui/elements/inputs/UploadZone';
import { Stack } from '../../ui/layout/Stack/Stack';
import { UploadIcon } from '../../ui/icons';
import { uploadSyncFiles } from '../../domain/syncFiles';
import { InsertHelpDocument } from './helpDocumentMutations.generated';
import { titleForUpload } from './helpDocumentsLogic';

// S3 — the upload dialog (spec/help S3), a modal over the S2 management screen.
// The two-step publish: a title, then one file (OMS-REG-HLP-01.29). The record
// is created via GraphQL (title only); the file travels over the HTTP
// sync-files route ('help_document'). Supplying a file starts the publish
// immediately — there is no separate confirm.

const TABLE_NAME = 'help_document';

export const UploadHelpDocumentModal: Component<{
  open: boolean;
  onClose: () => void;
  /**
   * Re-read the list. Called after the record is created — even when the file
   * step then fails, a title-only record now exists (OMS-REG-HLP-01.32) and
   * must appear in the list.
   */
  onChanged: () => void;
}> = props => {
  const [title, setTitle] = createSignal('');
  const [uploading, setUploading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();

  // Closing resets the title (spec/help S3). Cancel/dismiss are disabled while
  // a publish is in flight, so this is a no-op then.
  const close = () => {
    if (uploading()) return;
    setTitle('');
    setErrorMessage(undefined);
    props.onClose();
  };

  const publish = async (file: File) => {
    setErrorMessage(undefined);
    // OMS-REG-HLP-01.29/.30: a file supplied with an empty (or whitespace-only)
    // title is refused client-side — nothing is created or queued.
    const checked = titleForUpload(title());
    if (!checked.ok) {
      setErrorMessage(t('error.help-document-title-required'));
      return;
    }

    setUploading(true);
    const id = generateUUID();
    // returnGraphqlErrors: the central gate ("Not a central server") and the
    // empty-title guard come back as top-level errors, while RecordAlreadyExist
    // (OMS-REG-HLP-01.31) is the typed union branch — surface both in-dialog.
    const insert = await graphqlFetch(
      InsertHelpDocument,
      { input: { id, title: checked.title } },
      { returnGraphqlErrors: true }
    );
    if (insert.kind !== 'success') {
      setUploading(false);
      // A graphqlError carries the server's description to show in-dialog;
      // other failures (unauthenticated / transport) are already surfaced
      // globally.
      if (insert.kind === 'graphqlError')
        setErrorMessage(
          t('error.an-error-occurred', { message: insert.message })
        );
      return;
    }
    const node = insert.data.centralServer.helpDocument.insertHelpDocument;
    if (node.__typename === 'InsertHelpDocumentError') {
      setUploading(false);
      setErrorMessage(
        t('error.an-error-occurred', { message: node.error.description })
      );
      return;
    }

    // Record created — now attach the file. A file-step failure leaves the
    // title-only record (OMS-REG-HLP-01.32), so refetch regardless so the list
    // shows it, then keep the dialog open carrying the error.
    const upload = await uploadSyncFiles(TABLE_NAME, id, [file]);
    setUploading(false);
    props.onChanged();
    if (!upload.ok) {
      setErrorMessage(
        t('error.an-error-occurred', { message: upload.message ?? '' })
      );
      return;
    }

    // Full success (OMS-REG-HLP-01.29): the dialog closes; the new first row is
    // the confirmation (spec/help D22 — no toast).
    setTitle('');
    props.onClose();
  };

  const onFiles = (files: File[]) => {
    const file = files[0];
    if (file) void publish(file);
  };

  return (
    <Dialog
      open={props.open}
      onClose={close}
      dismissable={!uploading()}
      title={t('label.upload-help-document')}
      icon={<UploadIcon />}
      testId="upload-help-document-modal"
      actions={
        <Button variant="secondary" disabled={uploading()} onClick={close}>
          {t('button.cancel')}
        </Button>
      }
    >
      <Stack gap="md">
        <TextField
          label={t('label.title')}
          value={title()}
          onInput={e => setTitle(e.currentTarget.value)}
          required
          disabled={uploading()}
          width="full"
        />
        {/* Supplying a file starts the publish; the dropzone is replaced by a
            busy indicator while it runs (spec/help S3). */}
        <Show
          when={!uploading()}
          fallback={<Spinner center label={t('loading')} />}
        >
          <UploadZone onFiles={onFiles} multiple={false} />
        </Show>
        <Show when={errorMessage()}>
          {message => <Alert severity="error">{message()}</Alert>}
        </Show>
      </Stack>
    </Dialog>
  );
};
