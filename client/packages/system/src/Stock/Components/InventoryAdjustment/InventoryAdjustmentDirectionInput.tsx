import React from 'react';
import {
  AdjustmentTypeInput,
  MinusIcon,
  PlusIcon,
  ToggleButtonGroup,
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
      id: 'decrease',
      label: t('label.decrease-qty'),
      value: AdjustmentTypeInput.Reduction,
      icon: <MinusIcon />,
    },
    {
      id: 'increase',
      label: t('label.increase-qty'),
      value: AdjustmentTypeInput.Addition,
      icon: <PlusIcon />,
    },
  ];

  return (
    <ToggleButtonGroup
      value={value}
      onChange={direction => onChange(direction)}
      options={options}
    />
  );
};
