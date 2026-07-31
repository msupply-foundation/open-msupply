import { type Component } from 'solid-js';
import { DocumentUploadPanel } from '../../../ui/elements/display/DocumentUploadPanel';
import { syncFileUrl } from '../../../domain/syncFiles';
import type { RequisitionInfoFragment } from './requisitionDetail.generated';

// The detail "Documents" tab (spec/requisitions S2 § Documents tab; AC-DT1/2):
// the record-documents panel's LIST HALF ALONE — the response side reads the
// customer's paperwork, it does not author its own, so there is NO upload zone
// on any status and no remove affordance in practice (rules › documents). A
// transferred requisition lists the customer's internal-order documents
// grouped with any of the requisition's own; each file opens through its OWN
// record's path (node.recordId — a transferred document serves under the
// LINKED internal order's path and 404s under this requisition's, contract ›
// documents).
const TABLE_NAME = 'requisition';

export const RequisitionDocumentsTab: Component<{
  node: RequisitionInfoFragment;
}> = props => (
  <DocumentUploadPanel
    documents={(props.node.documents?.nodes ?? []).map(document => ({
      id: document.id,
      fileName: document.fileName,
      createdDatetime: document.createdDatetime,
      totalBytes: document.totalBytes,
      // The download path rides each file's OWN recordId, never this
      // requisition's id.
      url: syncFileUrl(TABLE_NAME, document.recordId, document.id),
      // A remove shows only for a document recorded against the requisition
      // itself — which this side never records (rules › documents) — so no
      // row ever offers one.
      canDelete: false,
    }))}
    canUpload={false}
  />
);
