import React from 'react';
import {
  ModalLabel,
  useTranslation,
  NumericTextInput,
  useFormatNumber,
  useBufferState,
  useDebounceCallback,
  usePreferences,
} from '@openmsupply-client/common';
import { useAllocationContext } from '../useAllocationContext';
import { getAllocatedQuantity } from '../utils';

export const AutoAllocateField = ({
  inputColor,
  allowPartialPacks,
  autoFocus = true,
}: {
  inputColor?: string;
  allowPartialPacks?: boolean;
  autoFocus?: boolean;
}) => {
  const t = useTranslation();
  const { format } = useFormatNumber();
  const { expiredStockPreventIssue, expiredStockIssueThreshold } =
    usePreferences();

  const { autoAllocate, allocatedQuantity } = useAllocationContext(state => ({
    autoAllocate: state.autoAllocate,
    allocatedQuantity: getAllocatedQuantity(state),
    allocateIn: state.allocateIn,
  }));
  const [issueQuantity, setIssueQuantity] = useBufferState(allocatedQuantity);

  const debouncedAllocate = useDebounceCallback(
    quantity => {
      const allocated = autoAllocate(
        quantity,
        format,
        t,
        expiredStockPreventIssue ? (expiredStockIssueThreshold ?? 0) : 0,
        allowPartialPacks
      );
      setIssueQuantity(allocated);
    },
    [],
    1000
  );

  const handleIssueQuantityChange = (quantity: number | undefined) => {
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
        autoFocus={autoFocus}
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
