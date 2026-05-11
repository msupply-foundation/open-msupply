import React from 'react';
import { Autocomplete, useTranslation } from '@openmsupply-client/common';
import { NameRowFragment, useName } from '../../api';
import { basicFilterOptions, filterByNameAndCode } from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

export interface DonorSearchInputProps {
  onChange: (donor: NameRowFragment | null) => void;
  width?: number;
  fullWidth?: boolean;
  donorId: string | null;
  disabled?: boolean;
  clearable?: boolean;
}

export const DonorSearchInput = ({
  onChange,
  width = 250,
  fullWidth = false,
  donorId,
  disabled = false,
  clearable = false,
}: DonorSearchInputProps) => {
  const t = useTranslation();
  const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

  const { data, isLoading } = useName.document.donors();
  const { data: selectedDonor, isLoading: isLoadingSelected } =
    useName.document.get(donorId || '');

  const options = data?.nodes ?? [];
  const selectedOption = options.find(o => o.id === donorId) || selectedDonor;

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
