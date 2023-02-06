import React, { FC, useEffect } from 'react';
import {
  useToggle,
  useFormatNumber,
  useTranslation,
  styled,
  Autocomplete,
  defaultOptionMapper,
} from '@openmsupply-client/common';
import { useItemStockOnHand } from '../../api';
import { ItemStockOnHandFragment } from '../../api/operations.generated';

const ItemOption = styled('li')(({ theme }) => ({
  color: theme.palette.gray.main,
  backgroundColor: theme.palette.background.toolbar,
}));

const filterOptions = {
  stringify: (item: ItemStockOnHandFragment) => `${item.code} ${item.name}`,
  // limit: 100, // unsure why we had the limit, and why so low. performance is ok for me
};

const getOptionRenderer =
  (label: string, formatNumber: (value: number) => string) =>
  (props: React.HTMLAttributes<HTMLLIElement>, item: ItemStockOnHandFragment) =>
    (
      <ItemOption {...props} key={item.code}>
        <span style={{ whiteSpace: 'nowrap', width: 100 }}>{item.code}</span>
        <span style={{ whiteSpace: 'nowrap', width: 500 }}>{item.name}</span>
        <span
          style={{
            width: 200,
            textAlign: 'right',
            whiteSpace: 'nowrap',
          }}
        >{`${formatNumber(item.availableStockOnHand)} ${label}`}</span>
      </ItemOption>
    );

interface StockItemSearchInputProps {
  onChange: (item: ItemStockOnHandFragment | null) => void;
  currentItemId?: string | null;
  disabled?: boolean;
  extraFilter?: (item: ItemStockOnHandFragment) => boolean;
  width?: number;
  autoFocus?: boolean;
  openOnFocus?: boolean;
}

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
      filterOptionConfig={filterOptions}
      loading={isLoading}
      value={value ? { ...value, label: value.name ?? '' } : null}
      noOptionsText={t('error.no-items')}
      onChange={(_, item) => onChange(item)}
      options={defaultOptionMapper(options, 'name')}
      getOptionLabel={option => `${option.code}     ${option.name}`}
      renderOption={getOptionRenderer(t('label.units'), formatNumber.format)}
      width={width ? `${width}px` : '100%'}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      open={selectControl.isOn}
    />
  );
};
