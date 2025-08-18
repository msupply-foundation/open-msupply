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
import { createNumericInput, createTextInput } from '../../../common';

export type PurchaseOrderLineItem = Partial<PurchaseOrderLineFragment>;
export interface PurchaseOrderLineEditProps {
  isUpdateMode?: boolean;
  currentLine?: PurchaseOrderLineFragment;
  onChangeItem: (item: ItemStockOnHandFragment) => void;
  draft?: DraftPurchaseOrderLine | null;
  update: (patch: Partial<DraftPurchaseOrderLine>) => void;
  status: PurchaseOrderNodeStatus;
  isDisabled: boolean;
  lines?: PurchaseOrderLineFragment[];
}

export const PurchaseOrderLineEdit = ({
  isUpdateMode,
  currentLine,
  onChangeItem,
  draft,
  update,
  status,
  isDisabled = false,
  lines = [],
}: PurchaseOrderLineEditProps) => {
  const t = useTranslation();
  const showContent = !!draft && !!currentLine;
  const numericInput = createNumericInput(t, isDisabled);
  const textInput = createTextInput(t, isDisabled);

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
        Left={
          showContent ? (
            <>
              {numericInput('label.num-packs', draft?.numberOfPacks, {
                onChange: value => {
                  const newValue = value || 0;
                  update({
                    requestedNumberOfPacks: newValue,
                    requestedNumberOfUnits:
                      newValue * (draft?.requestedPackSize || 1),
                  });
                },
              })}
              {numericInput('label.pack-size', draft?.requestedPackSize, {
                onChange: value => {
                  const newValue = value || 0;
                  update({
                    requestedPackSize: value,
                    requestedNumberOfUnits:
                      (draft?.requestedNumberOfPacks || 0) * newValue,
                  });
                },
              })}
              {numericInput(
                'label.total-quantity',
                draft?.requestedNumberOfUnits,
                {
                  onChange: value => {
                    const newValue = value || 0;
                    update({
                      requestedNumberOfUnits: newValue,
                      requestedNumberOfPacks:
                        newValue / (draft?.requestedPackSize || 1),
                    });
                  },
                }
              )}
              {textInput(
                'label.unit-of-packs',
                draft?.unitOfPacks || '',
                value => update({ unitOfPacks: value })
              )}
              {textInput(
                'label.supplier-item-code',
                draft?.supplierItemCode || '',
                value => update({ unitOfPacks: value })
              )}
            </>
          ) : null
        }
        Middle={
          showContent ? (
            <>
              {numericInput(
                'label.price-per-unit-before-discount',
                draft?.pricePerUnitBeforeDiscount,
                {
                  onChange: value => {
                    update({
                      pricePerUnitBeforeDiscount: value,
                    });
                  },
                }
              )}
              {numericInput(
                'label.discount-percentage',
                draft?.pricePerUnitBeforeDiscount,
                {
                  onChange: value => {
                    update({
                      pricePerUnitBeforeDiscount: value,
                    });
                  },
                  max: 100,
                  decimalLimit: 2,
                  endAdornment: '%',
                }
              )}
              {numericInput(
                'label.price-per-unit-after-discount',
                draft?.pricePerUnitAfterDiscount,
                {
                  onChange: value => {
                    update({
                      pricePerUnitAfterDiscount: value,
                    });
                  },
                }
              )}
            </>
          ) : null
        }
        Right={null}
      />
    </>
  );
};
