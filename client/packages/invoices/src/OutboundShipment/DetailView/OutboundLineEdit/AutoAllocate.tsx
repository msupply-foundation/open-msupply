import React from 'react';
import {
  Grid,
  ModalLabel,
  useTranslation,
  Divider,
  Box,
  NumericTextInput,
  useFormatNumber,
  useBufferState,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { StockOutAlerts } from '../../../StockOut';
import { useAllocationContext } from './allocation/useAllocationContext';
import { AllocateIn } from './AllocateIn';

// AGNOSTIC OF WHAT WE ARE ISSUING IN (Packs of X, units, doses...)
export const AutoAllocate = () => {
  const t = useTranslation();
  const { format } = useFormatNumber();

  const { autoAllocate, alerts, allocatedQuantity, isAutoAllocated } =
    useAllocationContext(state => ({
      autoAllocate: state.autoAllocate,
      alerts: state.alerts,
      allocatedQuantity: Math.round(
        state.allocatedUnits / (state.allocateIn === -1 ? 1 : state.allocateIn)
      ),
      isAutoAllocated: state.isAutoAllocated,
    }));

  // Using buffer state with the allocated quantity, so gets pre-populated with existing
  // quantity, and updated when the user edits the individual lines
  const [issueQuantity, setIssueQuantity] = useBufferState(allocatedQuantity);

  // TODO, can we use simpler debounce?

  // using a debounced value for the allocation. In the scenario where
  // you have only pack sizes > 1 available, and try to type a quantity which starts with 1
  // e.g. 10, 12, 100.. then the allocation rounds the 1 up immediately to the available
  // pack size which stops you entering the required quantity.
  // See https://github.com/msupply-foundation/open-msupply/issues/2727
  const debouncedAllocate = useDebounceCallback(
    quantity => autoAllocate(quantity, format, t),
    [],
    500
  );

  const handleIssueQuantityChange = (quantity: number | undefined) => {
    // this method is also called onBlur... check that there actually has been a change
    // in quantity (to prevent triggering auto allocation if only focus has moved)
    if (quantity === issueQuantity) return;

    setIssueQuantity(quantity ?? 0);
    debouncedAllocate(quantity ?? 0);
  };

  return (
    <Grid container gap="4px" width="100%">
      <>
        <Divider margin={10} />
        <Box display="flex" alignItems="flex-start" gap={2}>
          <Grid container alignItems="center" pt={1}>
            <ModalLabel label={t('label.issue')} />
            <AllocateIn />
            <Box marginLeft={1} />
            <NumericTextInput
              autoFocus
              value={issueQuantity}
              onChange={handleIssueQuantityChange}
            />
          </Grid>
          <StockOutAlerts
            allocationAlerts={alerts}
            showZeroQuantityConfirmation={false} // TODO - only on first save... easier?
            isAutoAllocated={isAutoAllocated}
          />
        </Box>
      </>
    </Grid>
  );
};
