import React, { FC } from 'react';
import {
  Autocomplete,
  useBufferState,
  useTranslation,
} from '@openmsupply-client/common';
import { useName } from '../../api';
import {
  NameSearchInputProps,
  basicFilterOptions,
  filterByNameAndCode,
} from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

export const CustomerSearchInput: FC<NameSearchInputProps> = ({
  onChange,
  width = 250,
  value,
  disabled = false,
}) => {
  const { data, isLoading } = useName.document.customers();
  const [buffer, setBuffer] = useBufferState(value);
  const t = useTranslation();
  const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

  return (
    <Autocomplete
      disabled={disabled}
      clearable={false}
      value={buffer && { ...buffer, label: buffer.name }}
      filterOptionConfig={basicFilterOptions}
      filterOptions={filterByNameAndCode}
      loading={isLoading}
      onChange={(_, name) => {
        setBuffer(name);
        name && onChange(name);
      }}
      options={data?.nodes ?? []}
      renderOption={NameOptionRenderer}
      width={`${width}px`}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      getOptionDisabled={option => option.isOnHold}
      sx={{ minWidth: width }}
    />
  );
};
