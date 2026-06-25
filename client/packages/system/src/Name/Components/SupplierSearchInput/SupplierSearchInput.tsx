import React from 'react';
import {
  InfiniteSearchPicker,
  NameFilterInput,
  useTranslation,
} from '@openmsupply-client/common';
import { useName, NameRowFragment } from '../../api';
import { NameSearchInputProps } from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

interface SupplierSearchInputProps extends NameSearchInputProps {
  external?: boolean;
  autoFocus?: boolean;
  openOnFocus?: boolean;
}

export const SupplierSearchInput = ({
  onChange,
  width = 250,
  value,
  disabled = false,
  clearable = false,
  currentId,
  extraFilter,
  filterBy,
  external = false,
  autoFocus = false,
  openOnFocus = false,
}: SupplierSearchInputProps) => {
  const t = useTranslation();
  const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

  const useInfiniteData = external
    ? useName.document.externalSuppliersInfinite
    : useName.document.suppliersInfinite;

  return (
    <InfiniteSearchPicker<NameRowFragment, NameFilterInput>
      value={value}
      onChange={onChange}
      currentId={currentId}
      useInfiniteData={useInfiniteData}
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
