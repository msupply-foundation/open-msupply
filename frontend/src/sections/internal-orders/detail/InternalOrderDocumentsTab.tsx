import { type Component } from 'solid-js';
import { RecordDocumentsTab } from '@/domain/syncFiles';
import type { InternalOrderInfoFragment } from './internalOrderDetail.generated';

// The Documents tab (spec S3, AC-F1–F6). Documents sit OUTSIDE the lifecycle
// gate, but a disabled supplier store withholds upload and remove (AC-F2/F5).
export const InternalOrderDocumentsTab: Component<{
  storeId: string;
  node: InternalOrderInfoFragment;
  supplierEnabled: boolean;
  onChanged: () => void;
}> = props => (
  <RecordDocumentsTab
    tableName="requisition"
    recordId={props.node.id}
    documents={props.node.documents?.nodes ?? []}
    canUpload={props.supplierEnabled}
    canDelete={props.supplierEnabled}
    onChanged={props.onChanged}
  />
);
