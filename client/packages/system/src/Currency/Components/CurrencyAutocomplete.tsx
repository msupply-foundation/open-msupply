import React from 'react';
import {
  Autocomplete,
  AutocompleteOptionRenderer,
  DefaultAutocompleteItemOption,
  Box,
  Typography,
  SxProps,
} from '@openmsupply-client/common';
import { CurrencyRowFragment, useCurrencyList } from '../api';

interface CurrencyAutocompleteProps {
  value?: CurrencyRowFragment | null;
  width?: number;
  popperMinWidth?: number;
  onChange: (currency: CurrencyRowFragment | null) => void;
  disabled?: boolean;
  sx?: SxProps;
}

const currencyConfigOption = {
  stringify: (currency: CurrencyRowFragment) => `${currency.code}`,
  limit: 100,
};

const getCurrencyOptionRenderer =
  (): AutocompleteOptionRenderer<CurrencyRowFragment> => (props, currency) => {
    return (
      <DefaultAutocompleteItemOption {...props} key={props.id}>
        <Box display="flex" alignItems="flex-end" gap={1} height={25}>
          <Typography>{currency.code}</Typography>
        </Box>
      </DefaultAutocompleteItemOption>
    );
  };

export const CurrencyAutocomplete = ({
  value,
  width,
  popperMinWidth,
  onChange,
  disabled = false,
  sx,
}: CurrencyAutocompleteProps) => {
  const { data, isLoading } = useCurrencyList();
  const homeCurrency = data?.nodes.find(
    currency => currency.isHomeCurrency
  ) as CurrencyRowFragment;
  const currencyOptionRenderer = getCurrencyOptionRenderer();

  if (!data) return null;

  return (
    <Autocomplete
      clearable={false}
      value={
        value
          ? { ...value, label: value.code }
          : homeCurrency
            ? { ...homeCurrency, label: homeCurrency.code }
            : null
      }
      loading={isLoading}
      onChange={(_, currency) => onChange(currency)}
      filterOptionConfig={currencyConfigOption}
      options={data?.nodes ?? []}
      renderOption={currencyOptionRenderer}
      width={width ? `${width}px` : undefined}
      popperMinWidth={popperMinWidth}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      disabled={disabled}
      sx={sx}
    />
  );
};
