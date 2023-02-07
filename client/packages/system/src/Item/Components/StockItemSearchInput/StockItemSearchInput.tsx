import React, { FC, useEffect } from 'react';
import {
  useToggle,
  useFormatNumber,
  useTranslation,
  Autocomplete,
  defaultOptionMapper,
} from '@openmsupply-client/common';
import { useItemStockOnHand } from '../../api';
import { itemFilterOptions, StockItemSearchInputProps } from '../../utils';
import { getItemOptionRenderer } from '../ItemOptionRenderer';

export const StockItemSearchInput: FC<StockItemSearchInputProps> = ({
  onChange,
  currentItemId,
  disabled = false,
  extraFilter,
  width,
  autoFocus = false,
  openOnFocus,
}) => {
  const { data, isLoading } = useItemStockOnHand();
  const t = useTranslation('common');
  const formatNumber = useFormatNumber();

  const value = data?.nodes.find(({ id }) => id === currentItemId) ?? null;
  const selectControl = useToggle();

  const options = extraFilter
    ? data?.nodes?.filter(extraFilter) ?? []
    : data?.nodes ?? [];

  useEffect(() => {
    // using the Autocomplete openOnFocus prop, the popper is incorrectly positioned
    // when used within a Dialog. This is a workaround to fix the popper position.
    if (openOnFocus) {
      setTimeout(() => selectControl.toggleOn(), 300);
    }
  }, []);

  return (
    <Autocomplete
      autoFocus={autoFocus}
      disabled={disabled}
      onOpen={selectControl.toggleOn}
      onClose={selectControl.toggleOff}
      filterOptionConfig={itemFilterOptions}
      loading={isLoading}
      value={value ? { ...value, label: value.name ?? '' } : null}
      noOptionsText={t('error.no-items')}
      onChange={(_, item) => onChange(item)}
      options={defaultOptionMapper(options, 'name')}
      getOptionLabel={option => `${option.code}     ${option.name}`}
      renderOption={getItemOptionRenderer(t('label.units'), formatNumber.format)}
      width={width ? `${width}px` : '100%'}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      open={selectControl.isOn}
    />
  );
};
