import React from 'react';
import {
  InputWithLabelRow,
  ModalGridLayout,
  PurchaseOrderNodeStatus,
  useMediaQuery,
  useTranslation,
} from '@openmsupply-client/common';
import { PurchaseOrderLineFragment } from '../../api';
import {
  ItemStockOnHandFragment,
  ManufacturerSearchInput,
  StockItemSearchInput,
} from '@openmsupply-client/system/src';
import { DraftPurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';
import {
  createDateInput,
  createMultilineTextInput,
  createNumericInput,
  createTextInput,
} from '../../../common';

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
  const isVerticalScreen = useMediaQuery('(max-width:800px)');
  const numericInput = createNumericInput(t, isDisabled, isVerticalScreen);
  const textInput = createTextInput(t, isDisabled, isVerticalScreen);
  const multilineTextInput = createMultilineTextInput(t, isDisabled);
  const dateInput = createDateInput(t, isDisabled, isVerticalScreen);

  return (
    <>
      <ModalGridLayout
        showExtraFields={true}
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
                value => update({ supplierItemCode: value })
              )}
              <InputWithLabelRow
                Input={
                  <ManufacturerSearchInput
                    disabled={isDisabled}
                    value={draft?.manufacturer ?? null}
                    onChange={manufacturer =>
                      update({ manufacturer: manufacturer || null })
                    }
                    textSx={
                      isDisabled
                        ? {
                            backgroundColor: theme =>
                              theme.palette.background.toolbar,
                            boxShadow: 'none',
                          }
                        : {
                            backgroundColor: theme =>
                              theme.palette.background.white,
                            boxShadow: theme => theme.shadows[2],
                          }
                    }
                    width={185}
                  />
                }
                label={t('label.manufacturer')}
                labelProps={{ sx: { width: '100%', pl: 1 } }}
              />
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
        Right={
          showContent ? (
            <>
              {dateInput(
                'label.requested-delivery-date',
                draft?.requestedDeliveryDate,
                value => update({ requestedDeliveryDate: value })
              )}
              {dateInput(
                'label.expected-delivery-date',
                draft?.requestedDeliveryDate,
                value => update({ requestedDeliveryDate: value })
              )}
              {multilineTextInput(
                'label.comment',
                draft?.comment || '',
                value => update({ comment: value })
              )}
              {multilineTextInput('label.notes', draft?.note || '', value =>
                update({ note: value })
              )}
            </>
          ) : null
        }
      />
    </>
  );
};
