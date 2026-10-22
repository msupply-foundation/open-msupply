import { createSignal, Show, type Component } from 'solid-js';
import { DocumentUploadPanel } from '@/ui/elements/display/DocumentUploadPanel';
import { Alert } from '@/ui/elements/feedback/Alert';
import { deleteSyncFile, syncFileUrl } from '@/domain/syncFiles';
import type { RequisitionInfoFragment } from './requisitionDetail.generated';
import { isOwnDocument } from './requisitionDocuments';

// The detail "Documents" tab (spec/requisitions S2 § Documents tab;
// OMS-REG-DIST-06.40/.41): the record-documents panel with NO upload zone on
// any status — the response side reads the customer's paperwork, it does not
// author its own (rules › documents). A transferred requisition lists the
// customer's internal-order documents grouped with any of the requisition's
// own; each file opens through its OWN record's path (node.recordId — a
// transferred document serves under the LINKED internal order's path and 404s
// under this requisition's, contract › documents). Only a document recorded
// against the requisition itself offers a remove (confirmed first by the
// panel); the UI never produces one, but a direct upload to the endpoint does.
const TABLE_NAME = 'requisition';

export const RequisitionDocumentsTab: Component<{
  node: RequisitionInfoFragment;
  /** Re-read the requisition so a removal shows. */
  onChanged: () => void;
}> = props => {
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const documents = () => props.node.documents?.nodes ?? [];

  const onDelete = async (file: { id: string }) => {
    setErrorMessage(undefined);
    const document = documents().find(d => d.id === file.id);
    if (!document) return;
    const result = await deleteSyncFile(
      TABLE_NAME,
      document.recordId,
      document.id
    );
    if (result.ok) props.onChanged();
    else setErrorMessage(result.message);
  };

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
        documents={documents().map(document => ({
          id: document.id,
          fileName: document.fileName,
          createdDatetime: document.createdDatetime,
          totalBytes: document.totalBytes,
          // Download and delete ride each file's OWN recordId, never this
          // requisition's id.
          url: syncFileUrl(TABLE_NAME, document.recordId, document.id),
          canDelete: isOwnDocument(document, props.node.id),
        }))}
        canUpload={false}
        onDelete={file => void onDelete(file)}
      />
    </>
  );
};
