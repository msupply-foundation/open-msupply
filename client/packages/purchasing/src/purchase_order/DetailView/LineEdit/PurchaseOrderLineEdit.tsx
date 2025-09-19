import React from 'react';
import {
  Box,
  InputWithLabelRow,
  LocaleKey,
  ModalGridLayout,
  PurchaseOrderLineStatusNode,
  PurchaseOrderNodeStatus,
  Select,
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
  commonLabelProps,
  NumInputRow,
  useInputComponents,
} from '../../../common';
import {
  calculatePricesAndDiscount,
  calculateUnitQuantities,
  lineStatusOptions,
} from './utils';

export type PurchaseOrderLineItem = Partial<PurchaseOrderLineFragment>;
export interface PurchaseOrderLineEditProps {
  isUpdateMode?: boolean;
  draft?: DraftPurchaseOrderLine | null;
  update: (patch: Partial<DraftPurchaseOrderLine>) => void;
  status: PurchaseOrderNodeStatus;
  isDisabled: boolean;
  lines?: PurchaseOrderLineFragment[];
  onChangeItem: (item: ItemStockOnHandFragment) => void;
  lineCount?: number;
}

export const PurchaseOrderLineEdit = ({
  isUpdateMode,
  onChangeItem,
  draft,
  update,
  status,
  isDisabled = false,
  lines = [],
  lineCount = 0,
}: PurchaseOrderLineEditProps) => {
  const t = useTranslation();
  const showContent = !!draft?.itemId;
  const isVerticalScreen = useMediaQuery('(max-width:800px)');
  const disabled =
    isDisabled || draft?.status === PurchaseOrderLineStatusNode.Closed;
  const { numericInput, textInput, multilineTextInput, dateInput } =
    useInputComponents(t, disabled, isVerticalScreen);

  return (
    <>
      <ModalGridLayout
        showExtraFields={true}
        Top={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <StockItemSearchInput
              autoFocus={!isUpdateMode}
              openOnFocus={!isUpdateMode}
              disabled={isUpdateMode || disabled}
              currentItemId={draft?.itemId}
              onChange={newItem => newItem && onChangeItem(newItem)}
              extraFilter={item =>
                !lines.some(line => line.item.id === item.id)
              }
              filter={{ isVisible: true, ignoreForOrders: false }}
              width={825}
            />
            <InputWithLabelRow
              label={t('label.status')}
              Input={
                <Select
                  disabled={disabled}
                  sx={{
                    width: 200,
                  }}
                  options={lineStatusOptions(status).map(s => ({
                    value: s.value,
                    label: t(`status.${s.value.toLowerCase()}` as LocaleKey),
                    disabled: s.disabled,
                  }))}
                  value={draft?.status}
                  onChange={event =>
                    update({
                      status: event.target.value as PurchaseOrderLineStatusNode,
                    })
                  }
                />
              }
              sx={{
                justifyContent: 'flex-end',
              }}
            />
          </Box>
        }
        Left={
          showContent ? (
            <>
              <NumInputRow
                value={draft?.lineNumber || lineCount + 1}
                label={t('label.line-number')}
                disabled
                isVerticalScreen={isVerticalScreen}
              />
              <NumInputRow
                value={draft?.item.stats.stockOnHand || 0}
                label={t('label.stock-on-hand')}
                disabled
                isVerticalScreen={isVerticalScreen}
              />
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
                    disabled={disabled}
                    value={draft?.manufacturer ?? null}
                    onChange={manufacturer =>
                      update({ manufacturer: manufacturer || null })
                    }
                    textSx={
                      disabled
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
                status !== PurchaseOrderNodeStatus.Confirmed
                  ? 'label.requested-packs'
                  : 'label.adjusted-packs',
                draft?.numberOfPacks ?? 0,
                {
                  onChange: value => {
                    // Adjust the requested and adjusted number of units based
                    // on the number of packs * pack size
                    const adjustedPatch = calculateUnitQuantities(status, {
                      ...draft,
                      numberOfPacks: value,
                    });
                    update({ ...adjustedPatch, numberOfPacks: value });
                  },
                  decimalLimit: 2,
                  autoFocus: true,
                }
              )}
              {numericInput('label.pack-size', draft?.requestedPackSize, {
                onChange: requestedPackSize => {
                  // Adjust the requested and adjusted number of units based
                  // on the number of packs * pack size
                  const adjustedPatch = calculateUnitQuantities(status, {
                    ...draft,
                    requestedPackSize,
                  });
                  update({ ...adjustedPatch, requestedPackSize });
                },
                decimalLimit: 2,
              })}
              {numericInput(
                'label.requested-quantity',
                draft?.requestedNumberOfUnits,
                {
                  onChange: value => {
                    // Adjust the requested and adjusted number of units based on the number of packs
                    const adjustedPatch = calculateUnitQuantities(status, {
                      ...draft,
                      requestedNumberOfUnits: value,
                    });
                    update(adjustedPatch);
                  },
                  disabled: true,
                  decimalLimit: 2,
                }
              )}
              {status === PurchaseOrderNodeStatus.Confirmed &&
                numericInput(
                  'label.adjusted-units',
                  draft?.adjustedNumberOfUnits,
                  {
                    onChange: value => {
                      // Adjust the requested and adjusted number of units based on the number of packs
                      const adjustedPatch = calculateUnitQuantities(status, {
                        ...draft,
                        requestedNumberOfUnits: value,
                      });
                      update(adjustedPatch);
                    },
                    disabled: true,
                    decimalLimit: 2,
                  }
                )}
              {numericInput(
                'label.price-per-pack-before-discount',
                draft?.pricePerUnitBeforeDiscount * (draft?.requestedPackSize || 1),
                {
                  onChange: value => {
                    const adjustedPatch = calculatePricesAndDiscount(
                      'pricePerPackBeforeDiscount',
                      { ...draft, pricePerPackBeforeDiscount: value }
                    );
                    update(adjustedPatch);
                  },
                  decimalLimit: 2,
                }
              )}
              {numericInput(
                'label.discount-percentage',
                draft?.discountPercentage,
                {
                  onChange: value => {
                    const adjustedPatch = calculatePricesAndDiscount(
                      'discountPercentage',
                      { ...draft, discountPercentage: value }
                    );
                    update(adjustedPatch);
                  },
                  max: 100,
                  decimalLimit: 2,
                  endAdornment: '%',
                }
              )}
              {numericInput(
                'label.price-per-pack-after-discount',
                draft?.pricePerUnitAfterDiscount * (draft?.requestedPackSize || 1),
                {
                  onChange: value => {
                    const adjustedPatch = calculatePricesAndDiscount(
                      'pricePerPackAfterDiscount',
                      { ...draft, pricePerUnitAfterDiscount: value }
                    );
                    update(adjustedPatch);
                  },
                  decimalLimit: 2,
                }
              )}
              <NumInputRow
                label={t('label.total-cost')}
                value={
                  draft
                    ? (draft.pricePerUnitAfterDiscount ?? 0) *
                      (draft.requestedNumberOfUnits ?? 0)
                    : 0
                }
                disabled
                isVerticalScreen={isVerticalScreen}
              />
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
