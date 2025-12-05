import React, { useEffect } from 'react';
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

export const CustomerSearchInput = ({
  onChange,
  width = 250,
  value,
  disabled = false,
  clearable = false,
  currentId = undefined,
  extraFilter,
  filterBy,
}: NameSearchInputProps) => {
  const t = useTranslation();
  const { data, isLoading } = useName.document.customers(filterBy);
  const [buffer, setBuffer] = useBufferState(value);
  const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

  // For use in JSON forms
  useEffect(() => {
    if (currentId && !buffer) {
      const current = data?.nodes.find(name => name.id === currentId);
      if (current) {
        setBuffer(current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, data]);

  return (
    <Autocomplete
      disabled={disabled}
      clearable={clearable}
      value={buffer && { ...buffer, label: buffer.name }}
      filterOptionConfig={basicFilterOptions}
      filterOptions={(options, state) =>
        filterByNameAndCode(options, state, extraFilter)
      }
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
      sx={{ minWidth: width }}
    />
  );
};
