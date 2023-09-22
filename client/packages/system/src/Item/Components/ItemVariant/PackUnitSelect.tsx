import React, { FC } from 'react';
import { Select } from '@common/components';
import { VariantControl } from '../../context';

interface PackUnitSelectProps {
  variantControl: VariantControl;
}

export const PackUnitSelect: FC<PackUnitSelectProps> = ({ variantControl }) => {
  const { variants, activeVariant, setUserSelectedVariant } = variantControl;

  return (
    <Select
      sx={{ width: '150px' }}
      options={variants.map(v => ({
        label: v.shortName,
        value: v.id,
      }))}
      value={activeVariant.id}
      onClick={e => e.stopPropagation()}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        setUserSelectedVariant(e.target.value)
      }
    />
  );
};
