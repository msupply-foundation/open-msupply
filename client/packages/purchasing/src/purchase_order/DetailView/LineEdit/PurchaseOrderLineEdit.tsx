import React from 'react';
import {
  InputWithLabelRow,
  ModalGridLayout,
  // PurchaseOrderNodeStatus,
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
import { commonLabelProps, useInputComponents } from '../../../common';

export type PurchaseOrderLineItem = Partial<PurchaseOrderLineFragment>;
export interface PurchaseOrderLineEditProps {
  isUpdateMode?: boolean;
  draft?: DraftPurchaseOrderLine | null;
  update: (patch: Partial<DraftPurchaseOrderLine>) => void;
  // status: PurchaseOrderNodeStatus;
  isDisabled: boolean;
  lines?: PurchaseOrderLineFragment[];
  onChangeItem: (item: ItemStockOnHandFragment) => void;
}

export const PurchaseOrderLineEdit = ({
  isUpdateMode,
  onChangeItem,
  draft,
  update,
  // status,
  isDisabled = false,
  lines = [],
}: PurchaseOrderLineEditProps) => {
  const t = useTranslation();
  const showContent = !!draft?.itemId;
  const isVerticalScreen = useMediaQuery('(max-width:800px)');
  const { numericInput, textInput, multilineTextInput, dateInput } =
    useInputComponents(t, isDisabled, isVerticalScreen);

  return (
    <>
      <ModalGridLayout
        showExtraFields={true}
        Top={
          <StockItemSearchInput
            autoFocus={!draft}
            openOnFocus={!draft}
            disabled={isUpdateMode || isDisabled}
            currentItemId={draft?.itemId}
            onChange={newItem => newItem && onChangeItem(newItem)}
            extraFilter={item => !lines.some(line => line.item.id === item.id)}
          />
        }
        Left={
          showContent ? (
            <>
              {numericInput(
                'label.requested-packs',
                draft?.requestedNumberOfPacks,
                {
                  onChange: value => {
                    const newValue = value || 0;
                    update({
                      requestedNumberOfPacks: newValue,
                      requestedNumberOfUnits:
                        newValue * (draft?.requestedPackSize || 1),
                    });
                  },
                }
              )}
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
                'label.requested-quantity',
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
              {textInput('label.unit', draft?.unit || '', value =>
                update({ unit: value })
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
                labelProps={commonLabelProps}
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
                      pricePerUnitAfterDiscount:
                        draft?.pricePerUnitBeforeDiscount *
                        (1 - (draft?.discountPercentage || 0) / 100),
                    });
                  },
                }
              )}
              {numericInput(
                'label.discount-percentage',
                draft?.discountPercentage,
                {
                  onChange: value => {
                    update({
                      discountPercentage: value,
                      pricePerUnitAfterDiscount:
                        draft?.pricePerUnitBeforeDiscount *
                        (1 - (draft?.discountPercentage || 0) / 100),
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
                draft?.expectedDeliveryDate,
                value => update({ expectedDeliveryDate: value })
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
