import { type Component } from 'solid-js';
import { RecordDocumentsTab } from '@/domain/syncFiles';
import type { PurchaseOrderInfoFragment } from '../purchaseOrderDetail.generated';

// The Documents tab (spec/purchase-orders S12). Files may be added and removed
// while the order is open to change; once it is Sent or Finalised nothing can
// be attached and nothing removed (rules § documents and the activity log).
export const PurchaseOrderDocumentsTab: Component<{
  node: PurchaseOrderInfoFragment;
  canChange: boolean;
  onChanged: () => void;
}> = props => (
  <RecordDocumentsTab
    tableName="purchase_order"
    recordId={props.node.id}
    documents={props.node.documents?.nodes ?? []}
    canUpload={props.canChange}
    canDelete={props.canChange}
    onChanged={props.onChanged}
  />
);
