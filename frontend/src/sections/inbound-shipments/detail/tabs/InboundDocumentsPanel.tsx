import { createSignal, Show, type Component } from 'solid-js';
import { DocumentUploadPanel } from '../../../../ui/elements/display/DocumentUploadPanel';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import {
  uploadSyncFiles,
  deleteSyncFile,
  syncFileUrl,
} from '../../../../domain/syncFiles';
import type { InboundInfoFragment } from '../inboundShipmentDetail.generated';

// The detail "Documents" tab (spec S3 tabs → Documents): the shared documents
// table (filename, created date, file size) + upload/download/delete over the
// sync-file REST store (domain/syncFiles). Documents attach to the "invoice"
// table keyed by the shipment id. Upload/delete are blocked once the shipment
// is Verified.
const TABLE_NAME = 'invoice';

export const InboundDocumentsPanel: Component<{
  node: InboundInfoFragment;
  /** True once Verified — upload/delete disabled (spec editability gate). */
  disabled: boolean;
  /** Re-read the shipment node so the new documents list shows. */
  onChanged: () => void;
}> = props => {
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const onUpload = async (files: File[]) => {
    setErrorMessage(undefined);
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

  return (
    <>
      <Show when={errorMessage()}>
        <Alert severity="error">{errorMessage()}</Alert>
      </Show>
      <DocumentUploadPanel
        documents={(props.node.documents?.nodes ?? []).map(d => ({
          id: d.id,
          fileName: d.fileName,
          createdDatetime: d.createdDatetime,
          totalBytes: d.totalBytes,
          url: syncFileUrl(TABLE_NAME, props.node.id, d.id),
          canDelete: !props.disabled,
        }))}
        canUpload={!props.disabled}
        onUpload={files => void onUpload(files)}
        onDelete={document => void onDelete(document)}
      />
    </>
  );
};
