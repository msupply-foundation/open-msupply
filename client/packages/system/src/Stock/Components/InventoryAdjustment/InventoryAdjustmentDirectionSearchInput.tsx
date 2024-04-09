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
    { label: t('label.increase-qty'), value: Adjustment.Addition },
    { label: t('label.decrease-qty'), value: Adjustment.Reduction },
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
