import React, { FC } from 'react';
import {
  AdjustmentDirectionInput,
  Autocomplete,
  useTranslation,
} from '@openmsupply-client/common';

interface InventoryAdjustmentDirectionInputProps {
  value: AdjustmentDirectionInput | null;
  onChange: (direction?: AdjustmentDirectionInput) => void;
}

export const InventoryAdjustmentDirectionInput: FC<
  InventoryAdjustmentDirectionInputProps
> = ({ value, onChange }) => {
  const t = useTranslation('inventory');

  const options = [
    { label: t('label.addition'), value: AdjustmentDirectionInput.Addition },
    { label: t('label.reduction'), value: AdjustmentDirectionInput.Reduction },
  ];

  return (
    <Autocomplete
      options={options}
      clearable={false}
      value={options.find(option => option.value === value) ?? null}
      onChange={(_, direction) => {
        onChange(direction?.value);
      }}
    />
  );
};
