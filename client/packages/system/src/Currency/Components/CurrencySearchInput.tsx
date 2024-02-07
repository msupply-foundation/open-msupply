import React, { FC } from 'react';
import { CurrencyRowFragment, useCurrency } from '../api';
import {
  Autocomplete,
  AutocompleteOptionRenderer,
  Box,
  DefaultAutocompleteItemOption,
  InputWithLabelRow,
  TextWithLabelRow,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';

interface CurrencySearchInputProps {
  value?: CurrencyRowFragment | null;
  width?: number;
  disabled?: boolean;
  onChange: (currency: CurrencyRowFragment | null) => void;
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
}) => {
  const { data, isLoading } = useCurrency.document.list();
  const homeCurrency = data?.nodes.find(
    currency => currency.isHomeCurrency
  ) as CurrencyRowFragment;
  const t = useTranslation();
  const currencyOptionRenderer = getCurrencyOptionRenderer();

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
            disabled={disabled}
            clearable={false}
            value={
              value
                ? { ...value, label: value.code }
                : { ...homeCurrency, label: homeCurrency.code }
            }
            loading={isLoading}
            onChange={(_, currency) => {
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
      <TextWithLabelRow
        label={t('heading.rate')}
        text={String(value?.rate ?? 1)}
        textProps={{
          marginLeft: 10,
        }}
        labelProps={{ sx: { width: 0 } }}
      />
    </Box>
  );
};
