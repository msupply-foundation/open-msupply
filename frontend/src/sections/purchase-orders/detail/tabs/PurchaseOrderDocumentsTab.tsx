import { createSignal, Show, type Component } from 'solid-js';
import { t, formatFileSize } from '@/intl';
import { DocumentUploadPanel } from '@/ui/elements/display/DocumentUploadPanel';
import { Alert } from '@/ui/elements/feedback/Alert';
import type { FileRejection } from '@/ui/elements/inputs/uploadFiles';
import { uploadSyncFiles, deleteSyncFile, syncFileUrl } from '@/domain/syncFiles';
import type { PurchaseOrderInfoFragment } from '../purchaseOrderDetail.generated';

// The Documents tab (spec/purchase-orders S12): the app's shared documents
// panel over the sync-file store, keyed to the "purchase_order" table by the
// order's id. The list itself rides the order node (PurchaseOrderInfo.
// documents), so onChanged re-reads the node for an upload or a delete to
// show.
//
// This vertical contributes exactly ONE thing to that shared surface: the
// point at which it goes read-only. Files may be added and removed while the
// order is open to change; once it is Sent or Finalised nothing can be
// attached and nothing removed (rules § documents and the activity log) —
// unlike a stocktake's documents, which sit outside its lifecycle entirely.
const TABLE_NAME = 'purchase_order';

// The shared client-side accept list (the server stores any type).
const ACCEPT = '.pdf,.docx,.xlsx,.csv,.txt,.odt,.ods,.jpeg,.jpg,.png,.webp';
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB per file
const MAX_BATCH_BYTES = 100 * 1024 * 1024; // 100MB per request

export const PurchaseOrderDocumentsTab: Component<{
  node: PurchaseOrderInfoFragment;
  /** False once the order is Sent or Finalised — the list is then read-only. */
  canChange: boolean;
  /** Re-read the order node so the new documents list shows. */
  onChanged: () => void;
}> = props => {
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const onUpload = async (files: File[]) => {
    setErrorMessage(undefined);
    // A batch at or over 100MB is refused whole before anything is sent.
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (total >= MAX_BATCH_BYTES) {
      setErrorMessage(
        t('error.upload-too-large', {
          maxSize: formatFileSize(MAX_BATCH_BYTES),
        })
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

  // Per-file rejections: each unacceptable file named with its reason;
  // acceptable files still upload.
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
        }))}
        accept={ACCEPT}
        maxSize={MAX_FILE_BYTES}
        canUpload={props.canChange}
        onUpload={files => void onUpload(files)}
        // Removal closes with attachment: a closed order's list shows the
        // files and offers nothing.
        onDelete={
          props.canChange ? document => void onDelete(document) : undefined
        }
        onRejected={onRejected}
      />
    </>
  );
};
