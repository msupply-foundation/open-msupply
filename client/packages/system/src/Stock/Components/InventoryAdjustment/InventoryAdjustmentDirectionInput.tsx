import React from 'react';
import {
  AdjustmentTypeInput,
  Select,
  useTranslation,
} from '@openmsupply-client/common';

interface InventoryAdjustmentDirectionInputProps {
  value: AdjustmentTypeInput;
  onChange: (type: AdjustmentTypeInput) => void;
}

export const InventoryAdjustmentDirectionInput = ({
  value,
  onChange,
}: InventoryAdjustmentDirectionInputProps) => {
  const t = useTranslation();

  const options = [
    {
      label: t('label.increase'),
      value: AdjustmentTypeInput.Addition,
    },
    {
      label: t('label.decrease'),
      value: AdjustmentTypeInput.Reduction,
    },
  ];

  return (
    <Select
      value={value}
      onChange={e => onChange(e.target.value as AdjustmentTypeInput)}
      options={options}
      sx={{ width: '100%' }}
    />
  );
};
