import { createSignal, Show, type Component } from 'solid-js';
import { formatFileSize, t } from '@/intl';
import { DocumentUploadPanel } from '@/ui/elements/display/DocumentUploadPanel';
import { Alert } from '@/ui/elements/feedback/Alert';
import type { FileRejection } from '@/ui/elements/inputs/uploadFiles';
import { deleteSyncFile, syncFileUrl, uploadSyncFiles } from './syncFiles';
import {
  ACCEPT,
  batchTooLarge,
  describeRejections,
  MAX_BATCH_BYTES,
  MAX_FILE_BYTES,
} from './documentUploads';

export interface RecordDocument {
  id: string;
  fileName: string;
  createdDatetime?: string | null;
  totalBytes?: number | null;
}

export interface RecordDocumentsTabProps {
  /** The sync-file table the record's documents attach to. */
  tableName: string;
  recordId: string;
  /** The record node's own documents list. */
  documents: RecordDocument[];
  /** Default true; false hides the upload zone. */
  canUpload?: boolean;
  /** Default true; false hides every row's remove action. */
  canDelete?: boolean;
  /** Re-read the record so an upload or a delete shows. */
  onChanged: () => void;
}

// A record screen's Documents tab: the shared documents panel over the
// sync-file store, keyed to one table by the record's id. A vertical
// contributes only the two gates — whether files may be attached and removed.
export const RecordDocumentsTab: Component<RecordDocumentsTabProps> = props => {
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const onUpload = async (files: File[]) => {
    setErrorMessage(undefined);
    if (batchTooLarge(files)) {
      setErrorMessage(
        t('error.upload-too-large', {
          maxSize: formatFileSize(MAX_BATCH_BYTES),
        })
      );
      return;
    }
    const result = await uploadSyncFiles(
      props.tableName,
      props.recordId,
      files
    );
    if (result.ok) props.onChanged();
    else setErrorMessage(result.message);
  };

  const onDelete = async (document: { id: string }) => {
    setErrorMessage(undefined);
    const result = await deleteSyncFile(
      props.tableName,
      props.recordId,
      document.id
    );
    if (result.ok) props.onChanged();
    else setErrorMessage(result.message);
  };

  const onRejected = (rejections: FileRejection<File>[]) =>
    setErrorMessage(describeRejections(rejections));

  return (
    <>
      <Show when={errorMessage()}>
        {message => (
          <Alert severity="error" testId="document-upload-error">
            {message()}
          </Alert>
        )}
      </Show>
      <DocumentUploadPanel
        documents={props.documents.map(document => ({
          id: document.id,
          fileName: document.fileName,
          createdDatetime: document.createdDatetime,
          totalBytes: document.totalBytes,
          url: syncFileUrl(props.tableName, props.recordId, document.id),
          canDelete: props.canDelete !== false,
        }))}
        accept={ACCEPT}
        maxSize={MAX_FILE_BYTES}
        canUpload={props.canUpload !== false}
        onUpload={files => void onUpload(files)}
        onDelete={document => void onDelete(document)}
        onRejected={onRejected}
      />
    </>
  );
};
