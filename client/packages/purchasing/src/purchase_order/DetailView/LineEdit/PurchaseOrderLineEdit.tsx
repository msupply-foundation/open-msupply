import React from 'react';
/* Lines 2-34 omitted */
import {
  Box,
  Currencies,
  InputWithLabelRow,
  LocaleKey,
  ModalGridLayout,
  PurchaseOrderLineStatusNode,
  PurchaseOrderNodeStatus,
  Select,
  useCurrency,
  useAuthContext,
  useMediaQuery,
  UserPermission,
  useTranslation,
  NumUtils,
  NumInputRow,
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
  TextInput,
  MultilineTextInput,
  DateInput,
} from '../../../common';
import {
  calculatePricesAndDiscount,
  calculateUnitQuantities,
  lineStatusOptions,
} from './utils';
import { isFieldDisabled, StatusGroup } from '../../../utils';

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
  const { userHasPermission } = useAuthContext();
  const isVerticalScreen = useMediaQuery('(max-width:800px)');
  const { options } = useCurrency(
    draft?.purchaseOrder?.currency?.code as Currencies
  );

  const userIsAuthorised = userHasPermission(
    UserPermission.PurchaseOrderAuthorise
  );

  const getCurrencyValue = (value: number | null | undefined) => {
    if (value == null) return undefined;
    return NumUtils.round(value, options.precision);
  };

  // Disable input components. Individual inputs can override this
  const disabled =
    isDisabled || draft?.status === PurchaseOrderLineStatusNode.Closed;

  const canEditRequestedQuantity = isFieldDisabled(
    status,
    StatusGroup.BeforeConfirmed
  );

  return (
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
            extraFilter={item => !lines.some(line => line.item.id === item.id)}
            filter={{ isVisible: true, ignoreForOrders: false }}
            width={825}
          />
          <InputWithLabelRow
            label={t('label.status')}
            Input={
              <Select
                disabled={isFieldDisabled(status, StatusGroup.ExceptSent)}
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
            />
            <NumInputRow
              value={draft?.item.stats.stockOnHand || 0}
              label={t('label.stock-on-hand')}
            />
            <TextInput
              label={t('label.unit')}
              value={draft?.unit || ''}
              onChange={(value?: string) => update({ unit: value })}
              disabled={
                disabled || isFieldDisabled(status, StatusGroup.AfterConfirmed)
              }
              isVerticalScreen={isVerticalScreen}
            />
            <TextInput
              label={t('label.supplier-item-code')}
              value={draft?.supplierItemCode || ''}
              onChange={(value?: string) => update({ supplierItemCode: value })}
              disabled={disabled}
              isVerticalScreen={isVerticalScreen}
            />
            <InputWithLabelRow
              Input={
                <ManufacturerSearchInput
                  disabled={isFieldDisabled(status, StatusGroup.AfterConfirmed)}
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
            <NumInputRow
              label={t(
                canEditRequestedQuantity
                  ? 'label.requested-packs'
                  : 'label.adjusted-packs'
              )}
              value={draft?.numberOfPacks ?? 0}
              disabled={
                isDisabled || (!canEditRequestedQuantity && !userIsAuthorised)
              }
              onChange={(value: number | undefined) => {
                // Adjust the requested and adjusted number of units based
                // on the number of packs * pack size
                const adjustedPatch = calculateUnitQuantities(status, {
                  ...draft,
                  numberOfPacks: value,
                });
                update({ ...adjustedPatch, numberOfPacks: value });
              }}
              decimalLimit={2}
              autoFocus={true}
            />
            <NumInputRow
              label={t('label.pack-size')}
              value={draft?.requestedPackSize}
              disabled={
                disabled || isFieldDisabled(status, StatusGroup.AfterConfirmed)
              }
              onChange={(requestedPackSize: number | undefined) => {
                // Adjust the requested and adjusted number of units based
                // on the number of packs * pack size
                const adjustedPatch = calculateUnitQuantities(status, {
                  ...draft,
                  requestedPackSize,
                });
                update({ ...adjustedPatch, requestedPackSize });
              }}
              decimalLimit={2}
            />
            <NumInputRow
              label={t('label.requested-quantity')}
              value={draft?.requestedNumberOfUnits}
              disabled={true}
              decimalLimit={2}
            />
            {!canEditRequestedQuantity && (
              <NumInputRow
                label={t('label.adjusted-units')}
                value={draft?.adjustedNumberOfUnits ?? undefined}
                disabled={true}
                decimalLimit={2}
              />
            )}

            <NumInputRow
              label={t('label.price-per-pack-before-discount')}
              value={getCurrencyValue(draft?.pricePerPackBeforeDiscount)}
              disabled={
                disabled || isFieldDisabled(status, StatusGroup.AfterConfirmed)
              }
              onChange={(value: number | undefined) => {
                const adjustedPatch = calculatePricesAndDiscount(
                  'pricePerPackBeforeDiscount',
                  { ...draft, pricePerPackBeforeDiscount: value }
                );
                update(adjustedPatch);
              }}
              decimalLimit={options.precision}
              endAdornment={options.symbol}
            />
            <NumInputRow
              label={t('label.discount-percentage')}
              value={draft?.discountPercentage || 0}
              disabled={
                disabled || isFieldDisabled(status, StatusGroup.AfterConfirmed)
              }
              onChange={(value: number | undefined) => {
                const adjustedPatch = calculatePricesAndDiscount(
                  'discountPercentage',
                  { ...draft, discountPercentage: value }
                );
                update(adjustedPatch);
              }}
              max={100}
              decimalLimit={2}
              endAdornment="%"
            />
            <NumInputRow
              label={t('label.price-per-pack-after-discount')}
              value={getCurrencyValue(draft?.pricePerPackAfterDiscount) || 0}
              disabled={
                disabled || isFieldDisabled(status, StatusGroup.AfterConfirmed)
              }
              onChange={(value: number | undefined) => {
                const adjustedPatch = calculatePricesAndDiscount(
                  'pricePerPackAfterDiscount',
                  { ...draft, pricePerPackAfterDiscount: value }
                );
                update(adjustedPatch);
              }}
              decimalLimit={options.precision}
              endAdornment={options.symbol}
            />
            <NumInputRow
              label={t('label.total-cost')}
              value={
                draft
                  ? getCurrencyValue(
                      (draft.pricePerPackAfterDiscount ?? 0) *
                        (draft.numberOfPacks ?? 0)
                    ) || 0
                  : 0
              }
              decimalLimit={options.precision}
              endAdornment={options.symbol}
            />
          </>
        ) : null
      }
      Right={
        showContent ? (
          <>
            <DateInput
              label={t('label.requested-delivery-date')}
              value={draft?.requestedDeliveryDate}
              disabled={
                disabled || isFieldDisabled(status, StatusGroup.AfterConfirmed)
              }
              isVerticalScreen={isVerticalScreen}
              onChange={(value: string | null) =>
                update({ requestedDeliveryDate: value })
              }
            />
            <DateInput
              label={t('label.expected-delivery-date')}
              value={draft?.expectedDeliveryDate}
              disabled={
                disabled || isFieldDisabled(status, StatusGroup.AfterSent)
              }
              isVerticalScreen={isVerticalScreen}
              onChange={(value: string | null) =>
                update({ expectedDeliveryDate: value })
              }
            />
            <MultilineTextInput
              label={t('label.comment')}
              value={draft?.comment || ''}
              disabled={disabled}
              onChange={(value?: string) => update({ comment: value })}
            />
            <MultilineTextInput
              label={t('label.notes')}
              value={draft?.note || ''}
              disabled={disabled}
              onChange={(value?: string) => update({ note: value })}
            />
          </>
        ) : null
      }
    />
  );
};
