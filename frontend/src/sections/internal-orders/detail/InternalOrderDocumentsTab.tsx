import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { formatFileSize } from '../../../intl';
import { DocumentUploadPanel } from '../../../ui/elements/display/DocumentUploadPanel';
import { Alert } from '../../../ui/elements/feedback/Alert';
import type { FileRejection } from '../../../ui/elements/inputs/uploadFiles';
import {
  uploadSyncFiles,
  deleteSyncFile,
  syncFileUrl,
} from '../../../domain/syncFiles';
import type { InternalOrderInfoFragment } from './internalOrderDetail.generated';

// The detail "Documents" tab (spec S3 → Documents tab, AC-F1–F6): the shared
// documents panel (filename / date / size + upload/open/remove) over the
// sync-file REST store (domain/syncFiles), keyed to the "requisition" table by
// the order id. The list itself is a GraphQL read on the node; onChanged
// re-reads the node so an upload/delete reflects. Documents sit OUTSIDE the
// lifecycle gate — upload/remove stay available on any status — but a disabled
// supplier store withholds them (AC-F2/F5).
const TABLE_NAME = 'requisition';

// Accepted types (AC-F3): PDF/DOCX/XLSX/CSV/TXT/ODT/ODS/JPEG/PNG/WEBP, matched
// on extension. The server stores any type (a client-only filter, contract wire
// trap).
const ACCEPT = '.pdf,.docx,.xlsx,.csv,.txt,.odt,.ods,.jpeg,.jpg,.png,.webp';
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB per file
const MAX_BATCH_BYTES = 100 * 1024 * 1024; // 100MB per request

export const InternalOrderDocumentsTab: Component<{
  storeId: string;
  node: InternalOrderInfoFragment;
  /** Supplier-store enabled — false withholds the upload/remove affordances. */
  supplierEnabled: boolean;
  /** Re-read the order node so the new documents list shows. */
  onChanged: () => void;
}> = props => {
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const onUpload = async (files: File[]) => {
    setErrorMessage(undefined);
    // A batch at/over 100MB is refused whole before anything is sent (AC-F3).
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (total >= MAX_BATCH_BYTES) {
      setErrorMessage(
        t('error.upload-too-large', { maxSize: formatFileSize(MAX_BATCH_BYTES) })
      );
      return;
    }
    const result = await uploadSyncFiles(TABLE_NAME, props.node.id, files);
    if (result.ok) props.onChanged();
    else setErrorMessage(result.message);
  };

  const onDelete = async (document: { id: string }) => {
    setErrorMessage(undefined);
    const result = await deleteSyncFile(TABLE_NAME, props.node.id, document.id);
    if (result.ok) props.onChanged();
    else setErrorMessage(result.message);
  };

  // Per-file rejections (AC-F3): each unacceptable file named with its reason,
  // acceptable files still upload (UploadZone hands them on separately).
  const onRejected = (rejections: FileRejection<File>[]) => {
    setErrorMessage(
      rejections
        .map(rejection =>
          rejection.reason === 'size'
            ? t('error.file-exceeds-size-limit', {
                filename: rejection.file.name,
                maxSize: formatFileSize(MAX_FILE_BYTES),
              })
            : t('error.file-type-not-supported', {
                filename: rejection.file.name,
              })
        )
        .join('\n')
    );
  };

  return (
    <>
      <Show when={errorMessage()}>
        <Alert severity="error">{errorMessage()}</Alert>
      </Show>
      <DocumentUploadPanel
        documents={(props.node.documents?.nodes ?? []).map(document => ({
          id: document.id,
          fileName: document.fileName,
          createdDatetime: document.createdDatetime,
          totalBytes: document.totalBytes,
          url: syncFileUrl(TABLE_NAME, props.node.id, document.id),
          canDelete: props.supplierEnabled,
        }))}
        canUpload={props.supplierEnabled}
        accept={ACCEPT}
        maxSize={MAX_FILE_BYTES}
        onUpload={files => void onUpload(files)}
        onDelete={document => void onDelete(document)}
        onRejected={onRejected}
      />
    </>
  );
};
