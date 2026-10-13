import { type Component } from 'solid-js';
import { RecordDocumentsTab } from '@/domain/syncFiles';
import type { InternalOrderInfoFragment } from './internalOrderDetail.generated';

// The Documents tab (spec S3, OMS-REG-REPL-14.1–.6). Documents sit OUTSIDE the
// lifecycle gate, but a disabled supplier store withholds upload and remove
// (OMS-REG-REPL-14.2/.5).
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
