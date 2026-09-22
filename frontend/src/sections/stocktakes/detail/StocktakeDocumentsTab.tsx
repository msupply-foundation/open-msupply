import { type Component } from 'solid-js';
import { RecordDocumentsTab } from '@/domain/syncFiles';
import type { StocktakeInfoFragment } from './lines/stocktakeDetail.generated';

// The Documents tab (spec S3). Documents sit OUTSIDE the stocktake lifecycle
// gate — upload and remove stay available on any status, as in the real app.
export const StocktakeDocumentsTab: Component<{
  storeId: string;
  node: StocktakeInfoFragment;
  onChanged: () => void;
}> = props => (
  <RecordDocumentsTab
    tableName="stocktake"
    recordId={props.node.id}
    documents={props.node.documents?.nodes ?? []}
    onChanged={props.onChanged}
  />
);
