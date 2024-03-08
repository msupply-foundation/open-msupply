import React, { FC } from 'react';
import { Select } from '@common/components';
import { VariantControl } from '../../context';
import { SxProps, Theme } from '@common/styles';

interface PackUnitSelectProps {
  variantControl: VariantControl;
  sx?: SxProps<Theme>;
}

export const PackVariantSelect: FC<PackUnitSelectProps> = ({
  variantControl,
  sx,
}) => {
  const { variants, activeVariant, setUserSelectedPackVariant } =
    variantControl;

  return (
    <Select
      sx={sx}
      options={variants.map(v => ({
        label: v.shortName,
        value: v.id,
      }))}
      value={activeVariant.id}
      onClick={e => e.stopPropagation()}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        setUserSelectedPackVariant(e.target.value)
      }
    />
  );
};
