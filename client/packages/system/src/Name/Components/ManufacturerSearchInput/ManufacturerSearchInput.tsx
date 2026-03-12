import React from 'react';
import { Autocomplete, useTranslation } from '@openmsupply-client/common';
import { NameRowFragment, useName } from '../../api';
import { basicFilterOptions, filterByNameAndCode } from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

export interface ManufacturerSearchInputProps {
  onChange: (manufacturer: NameRowFragment | null) => void;
  width?: number;
  fullWidth?: boolean;
  manufacturerId: string | null;
  disabled?: boolean;
  clearable?: boolean;
}

export const ManufacturerSearchInput = ({
  onChange,
  width = 250,
  fullWidth = false,
  manufacturerId,
  disabled = false,
  clearable = true,
}: ManufacturerSearchInputProps) => {
  const t = useTranslation();
  const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

  const { data, isLoading } = useName.document.manufacturers();
  const { data: selectedManufacturer, isLoading: isLoadingSelected } =
    useName.document.get(manufacturerId || '');

  const options = data?.nodes ?? [];
  const selectedOption =
    options.find(o => o.id === manufacturerId) || selectedManufacturer;

  return (
    <Autocomplete
      disabled={disabled}
      clearable={clearable}
      value={
        selectedOption
          ? { ...selectedOption, label: selectedOption.name }
          : null
      }
      filterOptionConfig={basicFilterOptions}
      loading={isLoading || isLoadingSelected}
      onChange={(_, name) => onChange(name)}
      options={options}
      renderOption={NameOptionRenderer}
      getOptionLabel={option => option.name}
      filterOptions={filterByNameAndCode}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      getOptionDisabled={option => option.isOnHold}
      width={fullWidth ? undefined : `${width}px`}
      fullWidth={fullWidth}
    />
  );
};
