import React, { ReactElement, useState } from 'react';
import {
  NumericTextInput,
  useDebounceCallback,
} from '@openmsupply-client/common';

// This field displays a packSize number input
export const PackSizeNumberInput = ({
  itemId: _itemId,
  unitName: _unitName,
  isDisabled,
  packSize: initialPackSize,
  onChange,
}: {
  packSize: number;
  itemId: string;
  unitName: string | null;
  isDisabled?: boolean;
  onChange: (packSize: number) => void;
}): ReactElement => {
  const [packSize, setPackSize] = useState(initialPackSize ?? 1);

  const updater = useDebounceCallback(onChange, [onChange], 250);
  const disabled = isDisabled || false;

  // This is shared between input with drop down and without drop down
  const packSizeNumberInput = (
    <NumericTextInput
      value={packSize}
      onChange={newValue => {
        setPackSize(newValue || 1);
        updater(newValue || 1);
      }}
      disabled={disabled}
      width={50}
    />
  );

  return packSizeNumberInput;
};
