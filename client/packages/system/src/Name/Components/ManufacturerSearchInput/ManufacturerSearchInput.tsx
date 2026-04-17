import React from 'react';
import {
  Autocomplete,
  SxProps,
  Theme,
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
  fullWidth,
  value,
  disabled = false,
  textSx = {},
}: NullableNameSearchInputProps & {
  textSx?: SxProps<Theme>;
  fullWidth?: boolean;
}) => {
  const t = useTranslation();
  const { data, isLoading } = useName.document.manufacturers();
  const [buffer, setBuffer] = useBufferState(value, (a, b) => a?.id === b?.id);
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
      width={fullWidth ? '100%' : `${width}px`}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      getOptionDisabled={option => option.isOnHold}
      textSx={textSx}
    />
  );
};
