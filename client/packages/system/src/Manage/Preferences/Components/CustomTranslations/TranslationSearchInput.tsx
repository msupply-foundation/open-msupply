import React from 'react';
import {
  Autocomplete,
  Box,
  LocaleKey,
  Typography,
  useIntl,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';

interface TranslationSearchInputProps {
  onChange: (option: TranslationOption | null) => void;
  width?: number;
  fullWidth?: boolean;
}

export interface TranslationOption {
  key: string;
  default: string;
}

export const TranslationSearchInput = ({
  onChange,
  fullWidth,
}: TranslationSearchInputProps) => {
  const t = useTranslation();
  const theme = useTheme();
  const { i18n } = useIntl();

  // const { data, refetch } = useClinicians.document.list({});

  // const clinicians: ClinicianFragment[] = data?.nodes ?? [];

  const options = i18n?.store?.data['en']?.['common'] ?? {};
  const keys = Object.keys(options);

  const defaultTranslation = keys.map(k => ({
    key: k,
    default: t(k as LocaleKey),
  }));

  return (
    <Autocomplete
      value={null}
      // isOptionEqualToValue={(option, value) =>
      //   option.value.id === value.value?.id
      // }
      onChange={(_, option) => {
        onChange(option);
      }}
      options={defaultTranslation}
      sx={{ width: '100%' }}
      renderOption={(props, option) => (
        <li {...props} key={option.key}>
          <Typography>{option.key}</Typography>
          <Typography>{option.default}</Typography>
        </li>
      )}
      textSx={{ backgroundColor: theme.palette.background.drawer }}
      fullWidth
    />
  );
};
