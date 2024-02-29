import React, { FC } from 'react';
import { CurrencyRowFragment, useCurrency } from '../api';
import {
  Autocomplete,
  AutocompleteOptionRenderer,
  Box,
  DefaultAutocompleteItemOption,
  InputWithLabelRow,
  NonNegativeNumberInput,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';

interface CurrencySearchInputProps {
  value?: CurrencyRowFragment | null;
  width?: number;
  disabled?: boolean;
  onChange: (currency: CurrencyRowFragment | null) => void;
  currencyRate?: number;
}

export const getCurrencyOptionRenderer =
  (): AutocompleteOptionRenderer<CurrencyRowFragment> => (props, currency) => {
    return (
      <DefaultAutocompleteItemOption {...props} key={props.id}>
        <Box display="flex" alignItems="flex-end" gap={1} height={25}>
          <Typography>{currency.code}</Typography>
        </Box>
      </DefaultAutocompleteItemOption>
    );
  };

const currencyConfigOption = {
  stringify: (currency: CurrencyRowFragment) => `${currency.code}`,
  limit: 100,
};

export const CurrencySearchInput: FC<CurrencySearchInputProps> = ({
  value,
  width,
  disabled = false,
  onChange,
  currencyRate,
}) => {
  const { data, isLoading } = useCurrency.document.list();
  const homeCurrency = data?.nodes.find(
    currency => currency.isHomeCurrency
  ) as CurrencyRowFragment;
  const t = useTranslation();
  const currencyOptionRenderer = getCurrencyOptionRenderer();
  const [rate, setRate] = React.useState(currencyRate);

  if (!data) {
    return null;
  }

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <InputWithLabelRow
        label={t('label.currency')}
        labelWidth="100%"
        Input={
          <Autocomplete
            clearable={false}
            value={
              value
                ? { ...value, label: value.code }
                : { ...homeCurrency, label: homeCurrency.code }
            }
            loading={isLoading}
            onChange={(_, currency) => {
              setRate(currency?.rate);
              onChange(currency);
            }}
            filterOptionConfig={currencyConfigOption}
            options={data?.nodes ?? []}
            renderOption={currencyOptionRenderer}
            width={`${width}px`}
            popperMinWidth={width}
            isOptionEqualToValue={(option, value) => option?.id === value?.id}
          />
        }
      />
      <InputWithLabelRow
        label={t('heading.rate')}
        labelWidth="100%"
        Input={
          <NonNegativeNumberInput
            disabled={disabled}
            value={String(rate ?? 1)}
            sx={{
              width: `${width}px`,
            }}
            onChange={e => {
              setRate(Number(e));
              onChange({
                ...value,
                rate: e,
              } as CurrencyRowFragment);
            }}
          />
        }
      />
    </Box>
  );
};
