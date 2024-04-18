import React, { ReactElement, useEffect, useState } from 'react';
import {
  Select,
  NumericTextInput,
  useDebounceCallback,
  Box,
  useTranslation,
  Typography,
} from '@openmsupply-client/common';
import { usePackVariant } from '../../context';

const ENTER_PACK_SIZE = -1;

// This field displays a packSize number input and unit pack drop down if unit
// pack variants exist

export const PackVariantInput = ({
  itemId,
  unitName,
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
  const { variantsControl } = usePackVariant(itemId, unitName);
  const t = useTranslation();
  const [customPackSizeEnterable, setCustomPackSizeEnterable] = useState(false);
  const [shouldFocusInput, setShouldFocusInput] = useState(false);

  const [packSize, setPackSize] = useState(initialPackSize);

  useEffect(() => {
    let size = initialPackSize;

    // If pack size is 0 on load, set it to most used variant or 1 (ideally
    // should be default item pack)
    if (initialPackSize == 0) {
      size = variantsControl?.activeVariant?.packSize || 1;

      setPackSize(size);
      onChange(size);
    }
    // Make sure manual pack size is auto selected on load if packSize does not
    // match variant
    setCustomPackSizeEnterable(
      !variantsControl?.variants.some(v => v.packSize === size)
    );
  }, []);

  const updater = useDebounceCallback(onChange, [onChange], 250);
  const disabled = isDisabled || false;

  // This is shared between input with drop down and without drop down
  const packSizeNumberInput = (
    <NumericTextInput
      focusOnRender={shouldFocusInput}
      value={packSize}
      onChange={newValue => {
        setPackSize(newValue || 1);
        updater(newValue || 1);
      }}
      disabled={disabled}
      width={50}
    />
  );

  if (!variantsControl) {
    // If no variants exist, then default to just pack size entry
    return packSizeNumberInput;
  }

  const { variants } = variantsControl;

  const options = [
    ...variants.map(v => ({
      label: v.shortName,
      value: v.packSize,
    })),
    {
      label: t('label.custom'),
      value: ENTER_PACK_SIZE,
    },
  ];
  return (
    <Box display="flex" flexDirection="row" alignItems="center" gap="8px">
      <Select
        options={options}
        value={customPackSizeEnterable ? ENTER_PACK_SIZE : packSize}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const newValue = Number(e.target.value);

          // When manually entered pack size is selected, turn on manual entry
          // and set pack size to 1
          const isCustomPackVariant = newValue === ENTER_PACK_SIZE;
          const newPackSize = isCustomPackVariant ? 1 : newValue;

          setPackSize(newPackSize);
          setCustomPackSizeEnterable(isCustomPackVariant);
          setShouldFocusInput(isCustomPackVariant);
          updater(newPackSize);
        }}
        disabled={disabled}
      />

      <Typography>{'/'}</Typography>

      {
        /* Allow input only when manually entering pack size */
        customPackSizeEnterable ? (
          packSizeNumberInput
        ) : (
          <Typography>{String(packSize)}</Typography>
        )
      }
    </Box>
  );
};
