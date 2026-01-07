import React from 'react';
import {
  useTranslation,
  NumericTextInput,
  useFormatNumber,
  useDebounceCallback,
  InputLabel,
} from '@openmsupply-client/common';

import { AllocateInType, useAllocationContext } from '../../StockOut';

export const AutoAllocatePrescribedQuantityField = ({
  disabled = false,
}: {
  disabled?: boolean;
}) => {
  const t = useTranslation();
  const { format } = useFormatNumber();

  const { autoAllocate, prescribedQuantity, setPrescribedQuantity } =
    useAllocationContext(state => ({
      autoAllocate: state.autoAllocate,
      prescribedQuantity:
        state.allocateIn.type === AllocateInType.Doses
          ? (state.prescribedUnits ?? 0) * (state.item?.doses ?? 1)
          : state.prescribedUnits,
      setPrescribedQuantity: state.setPrescribedQuantity,
    }));

  // using a debounced value for the allocation. In the scenario where
  // you have only pack sizes > 1 available, and try to type a quantity which starts with 1
  // e.g. 10, 12, 100.. then the allocation rounds the 1 up immediately to the available
  // pack size which stops you entering the required quantity.
  // See https://github.com/msupply-foundation/open-msupply/issues/2727
  // and https://github.com/msupply-foundation/open-msupply/issues/3532
  const debouncedAllocate = useDebounceCallback(
    quantity => {
      autoAllocate(quantity, format, t, true);
    },
    [],
    500
  );

  const handlePrescribedQuantityChange = (quantity: number | undefined) => {
    if (disabled) return;

    // this method is also called onBlur... check that there actually has been a change
    // in quantity (to prevent triggering auto allocation if only focus has moved)
    if (quantity === prescribedQuantity) return;

    // Immediately update the prescribed quantity, attempt to auto-allocate after a wait time
    // (to allow the user to type a number without triggering auto allocation)
    setPrescribedQuantity(quantity ?? 0);
    debouncedAllocate(quantity ?? 0);
  };

  return (
    <>
      <InputLabel sx={{ fontSize: 12 }}>
        {t('label.prescribed-quantity')}
      </InputLabel>
      <NumericTextInput
        autoFocus={!disabled}
        disabled={disabled}
        value={prescribedQuantity ?? 0}
        onChange={handlePrescribedQuantityChange}
        slotProps={{ htmlInput: { sx: { backgroundColor: 'white' } } }}
      />
    </>
  );
};
