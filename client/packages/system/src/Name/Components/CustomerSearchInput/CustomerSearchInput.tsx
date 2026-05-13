import React from 'react';
import {
  InfiniteSearchPicker,
  NameFilterInput,
  useTranslation,
} from '@openmsupply-client/common';
import { useName, NameRowFragment } from '../../api';
import { NameSearchInputProps } from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

interface CustomerSearchInputExtraProps {
  autoFocus?: boolean;
  openOnFocus?: boolean;
}

export const CustomerSearchInput = ({
  onChange,
  width = 250,
  value,
  disabled = false,
  clearable = false,
  currentId,
  extraFilter,
  filterBy,
  autoFocus = false,
  openOnFocus = false,
}: NameSearchInputProps & CustomerSearchInputExtraProps) => {
  const t = useTranslation();
  const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

  return (
    <InfiniteSearchPicker<NameRowFragment, NameFilterInput>
      value={value}
      onChange={onChange}
      currentId={currentId}
      useInfiniteData={useName.document.customersInfinite}
      useGetById={useName.document.get}
      apiFilter={filterBy as NameFilterInput | undefined}
      getOptionLabel={option => option.name}
      getOptionCode={option => option.code}
      renderOption={NameOptionRenderer}
      getOptionDisabled={option => option.isOnHold}
      extraFilter={extraFilter}
      disabled={disabled}
      clearable={clearable}
      autoFocus={autoFocus}
      openOnFocus={openOnFocus}
      width={width}
      noOptionsText={t('label.no-options')}
    />
  );
};
