import React from 'react';
import {
  ModalLabel,
  useTranslation,
  NumericTextInput,
  useFormatNumber,
  useBufferState,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { useAllocationContext } from './useAllocationContext';
import { getAllocatedQuantity } from './utils';

export const AutoAllocateField = ({
  inputColor,
  allowPartialPacks,
}: {
  inputColor?: string;
  allowPartialPacks?: boolean;
}) => {
  const t = useTranslation();
  const { format } = useFormatNumber();

  const { autoAllocate, allocatedQuantity } = useAllocationContext(state => ({
    autoAllocate: state.autoAllocate,
    allocatedQuantity: getAllocatedQuantity(state),
    allocateIn: state.allocateIn,
  }));

  // Using buffer state with the allocated quantity, so gets pre-populated with existing
  // quantity, and updated when the user edits the individual lines
  const [issueQuantity, setIssueQuantity] = useBufferState(allocatedQuantity);

  // using a debounced value for the allocation. In the scenario where
  // you have only pack sizes > 1 available, and try to type a quantity which starts with 1
  // e.g. 10, 12, 100.. then the allocation rounds the 1 up immediately to the available
  // pack size which stops you entering the required quantity.
  // See https://github.com/msupply-foundation/open-msupply/issues/2727
  // and https://github.com/msupply-foundation/open-msupply/issues/3532
  const debouncedAllocate = useDebounceCallback(
    quantity => {
      const allocated = autoAllocate(quantity, format, t, allowPartialPacks);
      setIssueQuantity(allocated);
    },
    [],
    500
  );

  const handleIssueQuantityChange = (quantity: number | undefined) => {
    // this method is also called onBlur... check that there actually has been a change
    // in quantity (to prevent triggering auto allocation if only focus has moved)
    if (quantity === issueQuantity) return;

    // Set immediate value to the input
    // may be overwritten with actually allocated value after debounced call
    setIssueQuantity(quantity ?? 0);
    debouncedAllocate(quantity ?? 0);
  };

  return (
    <>
      <ModalLabel label={t('label.issue')} />
      <NumericTextInput
        autoFocus
        value={issueQuantity}
        onChange={handleIssueQuantityChange}
        slotProps={
          inputColor
            ? { htmlInput: { sx: { backgroundColor: inputColor } } }
            : undefined
        }
      />
    </>
  );
};
