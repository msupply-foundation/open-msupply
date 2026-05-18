import React, { FC } from 'react';
import {
  InfiniteSearchPicker,
  NameFilterInput,
  useTranslation,
} from '@openmsupply-client/common';
import { NameRowFragment, useName } from '../../api';
import { NameSearchInputProps } from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

interface InternalSupplierSearchInputExtraProps {
  autoFocus?: boolean;
  openOnFocus?: boolean;
}

export const InternalSupplierSearchInput: FC<
  NameSearchInputProps & InternalSupplierSearchInputExtraProps
> = ({
  onChange,
  width,
  value,
  disabled = false,
  clearable = false,
  currentId,
  extraFilter,
  filterBy,
  autoFocus = false,
  openOnFocus = false,
}) => {
  const t = useTranslation();
  const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

  return (
    <InfiniteSearchPicker<NameRowFragment, NameFilterInput>
      value={value}
      onChange={onChange}
      currentId={currentId}
      useInfiniteData={useName.document.internalSuppliersInfinite}
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
