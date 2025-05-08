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
  hasOnHold: boolean;
  hasExpired: boolean;
}

// AGNOSTIC OF WHAT WE ARE ISSUING IN (Packs of X, units, doses...)
export const AutoAllocate = ({
  packSizeController,
  // hasOnHold,
  // hasExpired,
}: AutoAllocateProps) => {
  const t = useTranslation();
  const { format } = useFormatNumber();

  const { autoAllocate, alerts } = useAllocationContext(
    ({ autoAllocate, alerts }) => ({
      autoAllocate,
      alerts,
    })
  );

  // TODO = prepopulate with existing (once we have initialisation)
  const [issueQuantity, setIssueQuantity] = useState<number>();

  // const onChangePackSize = (newPackSize: number) => {
  //   const packSize = newPackSize === -1 ? 1 : newPackSize;
  //   const newAllocatedQuantity =
  //     newPackSize === 0 ? 0 : Math.round(allocatedQuantity / packSize);

  //   packSizeController.setPackSize(newPackSize);
  //   allocate(newAllocatedQuantity, newPackSize);
  // };

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

  // const debouncedSetAllocationAlerts = useDebounceCallback(
  //   warning => setAllocationAlerts(warning),
  //   []
  // );

  // TODO: in allocation..
  // const placeholderLine = newAllocateQuantities?.find(isA.placeholderLine);
  // const allocatedQuantity =
  //   newAllocateQuantities?.reduce(
  //     (acc, { numberOfPacks, packSize }) => acc + numberOfPacks * packSize,
  //     0
  //   ) ?? 0;
  // const alerts = getAllocationAlerts(
  //   quantity * (packSize === -1 ? 1 : packSize),
  //   allocatedQuantity,
  //   placeholderLine?.numberOfPacks ?? 0,
  //   hasOnHold,
  //   hasExpired,
  //   format,
  //   t
  // );
  // debouncedSetAllocationAlerts(alerts);

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
    // [draftStockOutLines] // this is needed to prevent a captured enclosure of onChangeQuantity
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

  // useEffect(() => {
  //   if (!isAutoAllocated) updateIssueQuantity(allocatedQuantity);
  // }, [
  //   packSizeController.selected?.value,
  //   allocatedQuantity,
  //   isAutoAllocated,
  //   updateIssueQuantity,
  // ]);

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

            {/* TODO: allocate in X dropdown - see packsizecontroller */}
          </Grid>
          <StockOutAlerts
            allocationAlerts={alerts}
            showZeroQuantityConfirmation={false}
            isAutoAllocated={true}
          />
        </Box>
      </>
    </Grid>
  );
};
