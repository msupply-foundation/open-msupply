import React, { FC } from 'react';
import {
  AdjustmentTypeInput,
  Autocomplete,
  useTranslation,
} from '@openmsupply-client/common';

interface InventoryAdjustmentDirectionInputProps {
  value: AdjustmentTypeInput;
  onChange: (type?: AdjustmentTypeInput) => void;
}

export const InventoryAdjustmentDirectionInput: FC<
  InventoryAdjustmentDirectionInputProps
> = ({ value, onChange }) => {
  const t = useTranslation('inventory');

  const options = [
    { label: t('label.increase-qty'), value: AdjustmentTypeInput.Addition },
    { label: t('label.decrease-qty'), value: AdjustmentTypeInput.Reduction },
  ];

  return (
    <Autocomplete
      options={options}
      clearable={false}
      value={options.find(option => option.value === value) ?? null}
      onChange={(_, direction) => {
        onChange(direction?.value);
      }}
      sx={{
        '.MuiFormControl-root > .MuiInput-root, > input': {
          width: '160px',
        },
      }}
    />
  );
};
