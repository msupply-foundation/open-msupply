import React from 'react';
import { BasicTextInput, Grid, NumericTextInput, Typography, useTranslation } from '@openmsupply-client/common';
import { PurchaseOrderLineFragment, PurchaseOrderFragment } from '../../api';
import {
  ItemWithStatsFragment,
  StockItemSearchInputWithStats,
} from '@openmsupply-client/system/src';
import { canEditOriginalQuantity, canEditAdjustedQuantity, isPurchaseOrderConfirmed } from '../../utils';

export type PurchaseOrderLineItem = Partial<PurchaseOrderLineFragment>;
export interface PurchaseOrderLineEditProps {
  isUpdateMode?: boolean;
  currentItem?: PurchaseOrderLineFragment;
  lines: PurchaseOrderLineFragment[];
  purchaseOrder: PurchaseOrderFragment;
  onChangeItem: (item: ItemWithStatsFragment) => void;
  onUpdate: (patch: Partial<PurchaseOrderLineFragment>) => void;
}

export const PurchaseOrderLineEdit = ({
  isUpdateMode,
  currentItem,
  lines,
  purchaseOrder,
  onChangeItem,
  onUpdate,
}: PurchaseOrderLineEditProps) => {
  const t = useTranslation();
  const canEditOriginal = canEditOriginalQuantity(purchaseOrder);
  const canEditAdjusted = canEditAdjustedQuantity(purchaseOrder);
  const isConfirmed = isPurchaseOrderConfirmed(purchaseOrder);
  return (
    <Grid
      container
      spacing={1}
      direction="row"
      bgcolor="background.toolbar"
      padding={2}
      paddingBottom={1}
    >
      <Grid size={12} sx={{ mb: 2 }}>
        {(isUpdateMode && (
          <BasicTextInput
            value={`${currentItem?.item?.code}     ${currentItem?.item?.name}`}
            disabled
            fullWidth
          />
        )) || (
          <StockItemSearchInputWithStats
            autoFocus={!currentItem}
            openOnFocus={!currentItem}
            disabled={false}
            currentItemId={currentItem?.id}
            onChange={(newItem: ItemWithStatsFragment | null) =>
              newItem && onChangeItem(newItem)
            }
            extraFilter={item => !lines.some(line => line.item.id === item.id)}
          />
        )}
      </Grid>
      <Grid size={12} container spacing={2}>
        {isUpdateMode && currentItem && (
          <>
            {/* Pack Size */}
            <Grid size={6}>
              <NumericTextInput
                fullWidth
                label="Pack Size"
                value={currentItem.requestedPackSize ?? 0}
                onChange={(value) => onUpdate({ requestedPackSize: value })}
                disabled={!canEditOriginal}
              />
            </Grid>

            {/* Original/Requested Quantity */}
            <Grid size={6}>
              <NumericTextInput
                fullWidth
                label="Requested Quantity"
                value={currentItem.requestedNumberOfUnits ?? 0}
                onChange={(value) => onUpdate({ requestedNumberOfUnits: value })}
                disabled={!canEditOriginal}
              />
            </Grid>

            {/* Adjusted Quantity - only show for confirmed POs */}
            {isConfirmed && (
              <Grid size={6}>
                <NumericTextInput
                  fullWidth
                  label="Adjusted Quantity"
                  value={currentItem.adjustedNumberOfUnits ?? 0}
                  onChange={(value) => onUpdate({ adjustedNumberOfUnits: value })}
                  disabled={!canEditAdjusted}
                />
              </Grid>
            )}

            {/* Show pack size and quantity for new items */}
            {!isUpdateMode && currentItem && (
              <>
                <Grid size={6}>
                  <NumericTextInput
                    fullWidth
                    label="Pack Size"
                    value={currentItem.requestedPackSize ?? 0}
                    onChange={(value) => onUpdate({ requestedPackSize: value })}
                    disabled={isConfirmed && !canEditOriginal}
                  />
                </Grid>
                {isConfirmed ? (
                  <>
                    <Grid size={12}>
                      <Typography variant="body2" color="text.secondary">
                        {t('messages.purchase-order-confirmed-new-lines')}
                      </Typography>
                    </Grid>
                    <Grid size={6}>
                      <NumericTextInput
                        fullWidth
                        label="Adjusted Quantity"
                        value={currentItem.adjustedNumberOfUnits ?? 0}
                        onChange={(value) => onUpdate({ adjustedNumberOfUnits: value, requestedNumberOfUnits: 0 })}
                        disabled={!canEditAdjusted}
                      />
                    </Grid>
                  </>
                ) : (
                  <Grid size={6}>
                    <NumericTextInput
                      fullWidth
                      label="Requested Quantity"
                      value={currentItem.requestedNumberOfUnits ?? 0}
                      onChange={(value) => onUpdate({ requestedNumberOfUnits: value })}
                    />
                  </Grid>
                )}
              </>
            )}

            {/* Requested Delivery Date */}
            <Grid size={6}>
              <BasicTextInput
                fullWidth
                label="Requested Delivery Date"
                type="date"
                value={currentItem.requestedDeliveryDate || ''}
                onChange={(e) => onUpdate({ requestedDeliveryDate: e.target.value || null })}
                disabled={isConfirmed && !canEditAdjusted}
              />
            </Grid>

            {/* Expected Delivery Date */}
            <Grid size={6}>
              <BasicTextInput
                fullWidth
                label="Expected Delivery Date"
                type="date"
                value={currentItem.expectedDeliveryDate || ''}
                onChange={(e) => onUpdate({ expectedDeliveryDate: e.target.value || null })}
                disabled={isConfirmed && !canEditAdjusted}
              />
            </Grid>
          </>
        )}
      </Grid>
    </Grid>
  );
};
