import React, { useCallback, useState } from 'react';
import {
  Grid,
  ModalLabel,
  useTranslation,
  Divider,
  Box,
  NumericTextInput,
  useDebouncedValueCallback,
  useFormatNumber,
} from '@openmsupply-client/common';
import { PackSizeController, StockOutAlerts } from '../../../StockOut';
import { useAllocationContext } from './allocation/useAllocationContext';

interface AutoAllocateProps {
  packSizeController: PackSizeController;
}

// AGNOSTIC OF WHAT WE ARE ISSUING IN (Packs of X, units, doses...)
export const AutoAllocate = ({ packSizeController }: AutoAllocateProps) => {
  const t = useTranslation();
  const { format } = useFormatNumber();

  const { autoAllocate, alerts, allocatedQuantity, isAutoAllocated } =
    useAllocationContext(
      ({ autoAllocate, alerts, allocatedQuantity, isAutoAllocated }) => ({
        autoAllocate,
        alerts,
        allocatedQuantity,
        isAutoAllocated,
      })
    );

  // TODO = prepopulate with existing (once we have initialisation)
  const [issueQuantity, setIssueQuantity] = useState<number>();

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

  // using a debounced value for the allocation. In the scenario where
  // you have only pack sizes > 1 available, and try to type a quantity which starts with 1
  // e.g. 10, 12, 100.. then the allocation rounds the 1 up immediately to the available
  // pack size which stops you entering the required quantity.
  // See https://github.com/msupply-foundation/open-msupply/issues/2727
  const debouncedAllocate = useDebouncedValueCallback(
    (quantity, packSize) => {
      const allocatedQuantity = autoAllocate(quantity, format, t);
      if (allocatedQuantity !== undefined) {
        updateIssueQuantity(allocatedQuantity);
      }
    },
    [],
    500,
    []
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
            {allocatedQuantity}
            <Box marginLeft={1} />

            {/* TODO: allocate in X dropdown - see packsizecontroller */}
          </Grid>
          <StockOutAlerts
            allocationAlerts={alerts}
            showZeroQuantityConfirmation={false}
            isAutoAllocated={isAutoAllocated}
          />
        </Box>
      </>
    </Grid>
  );
};
