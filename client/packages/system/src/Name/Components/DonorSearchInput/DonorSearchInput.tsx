import React, { FC } from 'react';
import {
  Autocomplete,
  useBufferState,
  useTranslation,
} from '@openmsupply-client/common';
import { NameRowFragment, useName } from '../../api';
import {
  basicFilterOptions,
  filterByNameAndCode,
  NameSearchInputProps,
} from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

export const DonorSearchInput: FC<NameSearchInputProps> = ({
  onChange,
  onInputChange,
  width = 250,
  value,
  disabled = false,
  clearable = false,
}) => {
  const { data, isLoading } = useName.document.donors();
  const [buffer, setBuffer] = useBufferState(value);
  const t = useTranslation();
  const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

  return (
    <Autocomplete
      disabled={disabled}
      clearable={clearable}
      value={buffer && { ...buffer, label: buffer.name }}
      filterOptionConfig={basicFilterOptions}
      loading={isLoading}
      onChange={(_, name) => {
        setBuffer(name);
        name && onChange(name);
      }}
      onInputChange={onInputChange}
      options={data?.nodes ?? []}
      renderOption={NameOptionRenderer}
      getOptionLabel={(option: NameRowFragment) => option.name}
      filterOptions={filterByNameAndCode}
      width={`${width}px`}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      getOptionDisabled={option => option.isOnHold}
    />
  );
};
