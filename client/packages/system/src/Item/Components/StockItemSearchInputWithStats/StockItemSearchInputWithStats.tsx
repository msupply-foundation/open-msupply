import React, { useEffect } from 'react';
import {
  useToggle,
  useFormatNumber,
  useTranslation,
  Autocomplete,
  defaultOptionMapper,
  Tooltip,
} from '@openmsupply-client/common';
import { useStockItemsWithStats } from '../../api';
import {
  itemFilterOptions,
  StockItemSearchInputWithStatsProps,
} from '../../utils';
import { getItemOptionRenderer } from '../ItemOptionRenderer';

export const StockItemSearchInputWithStats = ({
  onChange,
  currentItemId,
  disabled = false,
  extraFilter,
  width,
  autoFocus = false,
  openOnFocus,
}: StockItemSearchInputWithStatsProps) => {
  const t = useTranslation();
  const { data, isLoading } = useStockItemsWithStats();
  const formatNumber = useFormatNumber();

  const value = data?.nodes.find(({ id }) => id === currentItemId) ?? null;
  const selectControl = useToggle();

  const options = extraFilter
    ? (data?.nodes?.filter(extraFilter) ?? [])
    : (data?.nodes ?? []);

  useEffect(() => {
    if (openOnFocus && !disabled) {
      setTimeout(() => selectControl.toggleOn(), 300);
    }
  }, [openOnFocus, disabled, selectControl]);

  return (
    <Tooltip title={value?.name}>
      <div>
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
          renderOption={getItemOptionRenderer(
            t('label.units'),
            formatNumber.format
          )}
          width={width ? `${width}px` : '100%'}
          popperMinWidth={width}
          isOptionEqualToValue={(option, value) => option?.id === value?.id}
          open={selectControl.isOn}
          sx={{
            '.MuiInputBase-root': { paddingLeft: disabled ? 0 : undefined },
            '.MuiBox-root': { justifyContent: 'flex-start' },
          }}
        />
      </div>
    </Tooltip>
  );
};
