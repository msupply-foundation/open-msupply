import React from 'react';
import {
  Autocomplete,
  useBufferState,
  useTranslation,
} from '@openmsupply-client/common';
import { useName } from '../../api';
import {
  basicFilterOptions,
  filterByNameAndCode,
  NullableNameSearchInputProps,
} from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

export const ManufacturerSearchInput = ({
  onChange,
  width = 250,
  value,
  disabled = false,
}: NullableNameSearchInputProps) => {
  const { data, isLoading } = useName.document.manufacturers();
  const [buffer, setBuffer] = useBufferState(value);
  const t = useTranslation();
  const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

  return (
    <Autocomplete
      disabled={disabled}
      value={buffer && { ...buffer, label: buffer.name }}
      filterOptionConfig={basicFilterOptions}
      filterOptions={filterByNameAndCode}
      loading={isLoading}
      onChange={(_, name) => {
        setBuffer(name);
        onChange(name);
      }}
      options={data?.nodes ?? []}
      renderOption={NameOptionRenderer}
      width={`${width}px`}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      getOptionDisabled={option => option.isOnHold}
    />
  );
};
