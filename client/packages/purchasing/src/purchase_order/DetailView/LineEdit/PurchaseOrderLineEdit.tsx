import React from 'react';
import {
  ModalGridLayout,
  PurchaseOrderNodeStatus,
  useTranslation,
} from '@openmsupply-client/common';
import { PurchaseOrderLineFragment } from '../../api';
import {
  ItemStockOnHandFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system/src';
import { DraftPurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';

export type PurchaseOrderLineItem = Partial<PurchaseOrderLineFragment>;
export interface PurchaseOrderLineEditProps {
  isUpdateMode?: boolean;
  currentLine?: PurchaseOrderLineFragment;
  onChangeItem: (item: ItemStockOnHandFragment) => void;
  draft?: DraftPurchaseOrderLine | null;
  updatePatch: (patch: Partial<DraftPurchaseOrderLine>) => void;
  status: PurchaseOrderNodeStatus;
  isDisabled: boolean;
  lines?: PurchaseOrderLineFragment[];
}

export const PurchaseOrderLineEdit = ({
  isUpdateMode,
  currentLine,
  onChangeItem,
  draft,
  updatePatch,
  status,
  isDisabled = false,
  lines = [],
}: PurchaseOrderLineEditProps) => {
  const t = useTranslation();
  const showContent = !!draft && !!currentLine;

  return (
    <>
      <ModalGridLayout
        Top={
          <StockItemSearchInput
            autoFocus={!currentLine}
            openOnFocus={!currentLine}
            disabled={isUpdateMode || isDisabled}
            currentItemId={currentLine?.item.id}
            onChange={newItem => newItem && onChangeItem(newItem)}
            extraFilter={item => !lines.some(line => line.item.id === item.id)}
          />
        }
        Left={null}
        Middle={null}
        Right={null}
      />
    </>
  );
};
