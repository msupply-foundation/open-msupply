import React, { FC } from 'react';
import { Autocomplete, useTranslation } from '@openmsupply-client/common';
import { Adjustment } from '@openmsupply-client/system';

interface InventoryAdjustmentDirectionInputProps {
  value: Adjustment | null;
  onChange: (direction?: Adjustment) => void;
}

export const InventoryAdjustmentDirectionInput: FC<
  InventoryAdjustmentDirectionInputProps
> = ({ value, onChange }) => {
  const t = useTranslation('inventory');

  const options = [
    { label: t('label.addition'), value: Adjustment.Addition },
    { label: t('label.reduction'), value: Adjustment.Reduction },
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
