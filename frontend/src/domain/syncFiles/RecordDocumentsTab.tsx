import { createSignal, Show, type JSX } from 'solid-js';
import { formatFileSize, t } from '@/intl';
import {
  DocumentUploadPanel,
  type DocumentFile,
} from '@/ui/elements/display/DocumentUploadPanel';
import { Alert } from '@/ui/elements/feedback/Alert';
import type { FileRejection } from '@/ui/elements/inputs/uploadFiles';
import { deleteSyncFile, syncFileUrl, uploadSyncFiles } from './syncFiles';
import { groupDocumentVersions } from './documentVersions';
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
  /** The uploader, where the record's fragment reads it (versioned lists). */
  user?: { username: string } | null;
  /**
   * The record the file is stored under, where it can differ from the tab's
   * own (a transferred requisition lists its linked internal order's files).
   * Opening and removing go through this record's path. Default: the tab's
   * `recordId`.
   */
  recordId?: string;
}

export interface RecordDocumentsTabProps<
  T extends RecordDocument = RecordDocument,
> {
  /** The sync-file table the record's documents attach to. */
  tableName: string;
  recordId: string;
  /** The record node's own documents list. */
  documents: T[];
  /** Default true; false hides the upload zone. */
  canUpload?: boolean;
  /** Default true; false hides every row's remove action. */
  canDelete?: boolean;
  /** Per-row remove gate, applied within `canDelete`. Default: every row. */
  canDeleteDocument?: (document: T) => boolean;
  /**
   * Treat same-named uploads as versions of one document: one row per file
   * name showing its latest version, who uploaded it and when, and its
   * version number, with the earlier versions reachable from the row — each
   * with its own uploader and moment (spec/purchase-orders rules § documents
   * and the activity log). Default false: every upload is its own row.
   */
  versioned?: boolean;
  /** Re-read the record so an upload or a delete shows. */
  onChanged: () => void;
}

// A record screen's Documents tab: the shared documents panel over the
// sync-file store, keyed to one table by the record's id. A vertical
// contributes only the gates — whether files may be attached and removed.
export const RecordDocumentsTab = <T extends RecordDocument>(
  props: RecordDocumentsTabProps<T>
): JSX.Element => {
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const recordIdOf = (document: RecordDocument) =>
    document.recordId ?? props.recordId;

  // A refused upload or removal shows inline, naming the server's reason
  // (spec/ui-standards controls › action feedback); success is the list
  // itself updating.
  const showFailure = (message?: string) =>
    setErrorMessage(t('error.an-error-occurred', { message: message ?? '' }));

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
    else showFailure(result.message);
  };

  // The panel hands back its row, which doesn't carry the record; the listed
  // document does.
  const onDelete = async (file: { id: string }) => {
    setErrorMessage(undefined);
    const document = props.documents.find(d => d.id === file.id);
    if (!document) return;
    const result = await deleteSyncFile(
      props.tableName,
      recordIdOf(document),
      document.id
    );
    if (result.ok) props.onChanged();
    else showFailure(result.message);
  };

  const onRejected = (rejections: FileRejection<File>[]) =>
    setErrorMessage(describeRejections(rejections));

  const toFile = (document: T): DocumentFile => ({
    id: document.id,
    fileName: document.fileName,
    createdDatetime: document.createdDatetime,
    uploadedBy: document.user?.username,
    totalBytes: document.totalBytes,
    url: syncFileUrl(props.tableName, recordIdOf(document), document.id),
    canDelete:
      props.canDelete !== false &&
      (props.canDeleteDocument?.(document) ?? true),
  });

  // One row per document. Versioned: the latest upload of each name is the
  // row, numbered, with its earlier versions beneath it; every version keeps
  // its own uploader and upload moment so each row reads per upload.
  const rows = (): DocumentFile[] =>
    props.versioned
      ? groupDocumentVersions(props.documents).map(group => ({
          ...toFile(group.latest),
          version: group.version,
          previousVersions: group.previous.map(previous => ({
            ...toFile(previous.document),
            version: previous.version,
          })),
        }))
      : props.documents.map(toFile);

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
        documents={rows()}
        versioned={props.versioned}
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
