import { type Component } from 'solid-js';
import { RecordDocumentsTab } from '@/domain/syncFiles';
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
export const RequisitionDocumentsTab: Component<{
  node: RequisitionInfoFragment;
  /** Re-read the requisition so a removal shows. */
  onChanged: () => void;
}> = props => (
  <RecordDocumentsTab
    tableName="requisition"
    recordId={props.node.id}
    documents={props.node.documents?.nodes ?? []}
    canUpload={false}
    canDeleteDocument={document => isOwnDocument(document, props.node.id)}
    onChanged={props.onChanged}
  />
);
