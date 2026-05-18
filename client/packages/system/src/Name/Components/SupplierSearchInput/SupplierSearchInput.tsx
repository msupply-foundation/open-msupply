import React, { useEffect } from 'react';
import {
  Autocomplete,
  CLEAR,
  useBufferState,
  useTranslation,
} from '@openmsupply-client/common';
import { useName } from '../../api';
import {
  basicFilterOptions,
  filterByNameAndCode,
  NameSearchInputProps,
} from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

interface SupplierSearchInputProps extends NameSearchInputProps {
  external?: boolean;
}

export const SupplierSearchInput = ({
  onChange,
  width = 250,
  value,
  disabled = false,
  clearable = false,
  currentId = undefined,
  external = false,
}: SupplierSearchInputProps) => {
  const t = useTranslation();
  const { data, isLoading } = useName.document.suppliers(external);
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
      filterOptions={filterByNameAndCode}
      loading={isLoading}
      onChange={(_, name) => {
        setBuffer(name);
        name && onChange(name);
      }}
      onInputChange={(
        _event: React.SyntheticEvent<Element, Event>,
        _value: string,
        reason: string
      ) => {
        if (reason === CLEAR) {
          onChange(null);
        }
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
