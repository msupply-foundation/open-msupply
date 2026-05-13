import React from 'react';
import {
  InfiniteSearchPicker,
  NameFilterInput,
  SxProps,
  Theme,
  useTranslation,
} from '@openmsupply-client/common';
import { useName, NameRowFragment } from '../../api';
import { NullableNameSearchInputProps } from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

export const ManufacturerSearchInput = ({
  onChange,
  width = 250,
  fullWidth,
  value,
  disabled = false,
  clearable = true,
  currentId,
  extraFilter,
  filterBy,
  textSx,
}: NullableNameSearchInputProps & {
  fullWidth?: boolean;
  textSx?: SxProps<Theme>;
}) => {
  const t = useTranslation();
  const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

  return (
    <InfiniteSearchPicker<NameRowFragment, NameFilterInput>
      value={value}
      onChange={onChange}
      currentId={currentId}
      useInfiniteData={useName.document.manufacturersInfinite}
      useGetById={useName.document.get}
      apiFilter={filterBy as NameFilterInput | undefined}
      getOptionLabel={option => option.name}
      getOptionCode={option => option.code}
      renderOption={NameOptionRenderer}
      getOptionDisabled={option => option.isOnHold}
      extraFilter={extraFilter}
      disabled={disabled}
      clearable={clearable}
      width={fullWidth ? undefined : width}
      popperMinWidth={width}
      textSx={textSx}
      noOptionsText={t('label.no-options')}
    />
  );
};
