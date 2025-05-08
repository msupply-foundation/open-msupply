import React, { useCallback, useEffect, useState } from 'react';
import {
  Grid,
  ModalLabel,
  Select,
  useTranslation,
  Divider,
  Box,
  useFormatNumber,
  useDebounceCallback,
  NumericTextInput,
  useDebouncedValueCallback,
  InputLabel,
} from '@openmsupply-client/common';
import { DraftItem } from '../../..';
import {
  PackSizeController,
  StockOutAlert,
  StockOutAlerts,
  getAllocationAlerts,
} from '../../../StockOut';
import { DraftStockOutLine } from '../../../types';
import { isA } from '../../../utils';

interface AutoAllocateProps {
  allocatedQuantity: number;
  item: DraftItem;
  onChangeQuantity: (
    quantity: number,
    packSize: number | null,
    isAutoAllocated: boolean
  ) => DraftStockOutLine[] | undefined;
  packSizeController: PackSizeController;
  isAutoAllocated: boolean;
  showZeroQuantityConfirmation: boolean;
  hasOnHold: boolean;
  hasExpired: boolean;
  draftStockOutLines: DraftStockOutLine[];
}

export const AutoAllocate = ({
  allocatedQuantity,
  onChangeQuantity,
  item,
  packSizeController,
  isAutoAllocated,
  showZeroQuantityConfirmation,
  hasOnHold,
  hasExpired,
  draftStockOutLines,
}: AutoAllocateProps) => {
  const t = useTranslation();
  const [allocationAlerts, setAllocationAlerts] = useState<StockOutAlert[]>([]);
  const [issueQuantity, setIssueQuantity] = useState<number>();
  const { format } = useFormatNumber();

  const onChangePackSize = (newPackSize: number) => {
    const packSize = newPackSize === -1 ? 1 : newPackSize;
    const newAllocatedQuantity =
      newPackSize === 0 ? 0 : Math.round(allocatedQuantity / packSize);

    packSizeController.setPackSize(newPackSize);
    allocate(newAllocatedQuantity, newPackSize);
  };

  const updateIssueQuantity = useCallback(
    (quantity: number) => {
      setIssueQuantity(
        Math.round(
          quantity / Math.abs(Number(packSizeController.selected?.value || 1))
        )
      );
    },
    [packSizeController.selected?.value]
  );

  const debouncedSetAllocationAlerts = useDebounceCallback(
    warning => setAllocationAlerts(warning),
    []
  );

  const allocate = (quantity: number, packSize: number) => {
    const newAllocateQuantities = onChangeQuantity(
      quantity,
      packSize === -1 ? null : packSize,
      true
    );
    const placeholderLine = newAllocateQuantities?.find(isA.placeholderLine);
    const allocatedQuantity =
      newAllocateQuantities?.reduce(
        (acc, { numberOfPacks, packSize }) => acc + numberOfPacks * packSize,
        0
      ) ?? 0;
    const alerts = getAllocationAlerts(
      quantity * (packSize === -1 ? 1 : packSize),
      allocatedQuantity,
      placeholderLine?.numberOfPacks ?? 0,
      hasOnHold,
      hasExpired,
      format,
      t
    );
    debouncedSetAllocationAlerts(alerts);
    updateIssueQuantity(allocatedQuantity);
  };

  // using a debounced value for the allocation. In the scenario where
  // you have only pack sizes > 1 available, and try to type a quantity which starts with 1
  // e.g. 10, 12, 100.. then the allocation rounds the 1 up immediately to the available
  // pack size which stops you entering the required quantity.
  // See https://github.com/msupply-foundation/open-msupply/issues/2727
  const debouncedAllocate = useDebouncedValueCallback(
    (quantity, packSize) => {
      allocate(quantity, packSize);
    },
    [],
    500,
    [draftStockOutLines] // this is needed to prevent a captured enclosure of onChangeQuantity
  );

  const handleIssueQuantityChange = (quantity: number | undefined) => {
    // this method is also called onBlur... check that there actually has been a change
    // in quantity (to prevent triggering auto allocation if only focus has moved)
    if (quantity === issueQuantity) return;

    setIssueQuantity(quantity ?? 0);
    debouncedAllocate(
      quantity ?? 0,
      Number(packSizeController.selected?.value)
    );
  };

  useEffect(() => {
    if (!isAutoAllocated) updateIssueQuantity(allocatedQuantity);
  }, [
    packSizeController.selected?.value,
    allocatedQuantity,
    isAutoAllocated,
    updateIssueQuantity,
  ]);

  return (
    <Grid container gap="4px" width="100%">
      <>
        <Divider margin={10} />
        <Box display="flex" alignItems="flex-start" gap={2}>
          <Grid container alignItems="center" pt={1}>
            <ModalLabel label={t('label.issue')} />
            <NumericTextInput
              autoFocus
              value={issueQuantity}
              onChange={handleIssueQuantityChange}
            />
            <Box marginLeft={1} />

            {packSizeController.options.length ? (
              <>
                <Box marginLeft={1} />
                <Select
                  sx={{ width: 110 }}
                  options={packSizeController.options}
                  value={packSizeController.selected?.value ?? ''}
                  onChange={e => {
                    const { value } = e.target;
                    onChangePackSize(Number(value));
                  }}
                />
                {packSizeController.selected?.value !== -1 && (
                  <Grid
                    alignItems="center"
                    display="flex"
                    justifyContent="flex-start"
                  >
                    <InputLabel style={{ fontSize: 12, marginLeft: 8 }}>
                      {t('label.unit-plural', {
                        count: packSizeController.selected?.value,
                        unit: item?.unitName,
                      })}
                    </InputLabel>
                  </Grid>
                )}
                <Box marginLeft="auto" />
              </>
            ) : null}
          </Grid>
          <StockOutAlerts
            allocationAlerts={allocationAlerts}
            showZeroQuantityConfirmation={showZeroQuantityConfirmation}
            isAutoAllocated={isAutoAllocated}
          />
        </Box>
      </>
    </Grid>
  );
};
