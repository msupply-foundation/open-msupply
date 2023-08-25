import React, { FC } from 'react';
import {
  Autocomplete,
  defaultOptionMapper,
  getDefaultOptionRenderer,
} from '@openmsupply-client/common';
import { VariantFragment } from '../../api';

interface ItemVariantSearchInputProps {
  value: VariantFragment | null;
  width?: number | string;
  onChange: (variant: VariantFragment | null) => void;
  disabled: boolean;
  autoFocus?: boolean;
  options: VariantFragment[];
}

export const ItemVariantSearchInput: FC<ItemVariantSearchInputProps> = ({
  value,
  onChange,
  disabled,
  autoFocus = false,
  options,
}) => {
  return (
    <Autocomplete<VariantFragment>
      autoFocus={autoFocus}
      disabled={disabled}
      clearable={false}
      value={
        value && {
          ...value,
          label: value.shortName,
        }
      }
      onChange={(_, variant) => {
        onChange(variant);
      }}
      options={defaultOptionMapper(options ?? [], 'shortName')}
      renderOption={getDefaultOptionRenderer('shortName')}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
    />
  );
};
