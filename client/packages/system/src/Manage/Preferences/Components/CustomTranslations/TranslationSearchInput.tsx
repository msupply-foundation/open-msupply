import React, { useMemo } from 'react';
import {
  Autocomplete,
  LocaleKey,
  useIntl,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';

interface TranslationSearchInputProps {
  onChange: (option: TranslationOption | null) => void;
  existingKeys: string[];
}

export interface TranslationOption {
  key: string;
  default: string;
}

export const TranslationSearchInput = ({
  onChange,
  existingKeys,
}: TranslationSearchInputProps) => {
  const t = useTranslation();
  const defaultT = useTranslation('common');
  const { i18n } = useIntl();
  const theme = useTheme();

  const nonTranslatedOptions = useMemo(() => {
    // English common is the base for translations, will always be available and have all keys
    const baseOptions = i18n?.store?.data['en']?.['common'] ?? {};
    const keys = Object.keys(baseOptions);

    return (
      keys
        // Autocomplete should only show keys that don't already have custom translations
        .filter(k => !existingKeys.includes(k))
        .map(k => ({
          key: k,
          // Use defaultT rather than direct from baseOption, so shows in users language
          default: defaultT(k as LocaleKey),
        }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingKeys.length]);

  return (
    <Autocomplete
      onChange={(_, option) => {
        onChange(option);
      }}
      options={nonTranslatedOptions}
      sx={{ width: '100%' }}
      renderOption={(props, option) => (
        <li {...props} key={option.key} style={{ display: 'flex', gap: '8px' }}>
          <span style={{ color: 'grey' }}>{option.key}</span>
          {option.default}
        </li>
      )}
      filterOptions={(options, { inputValue }) =>
        options.filter(o => {
          const caseInsensitive = new RegExp(inputValue, 'i');
          return (
            // Search by key or default translation
            o.key.match(caseInsensitive) || o.default.match(caseInsensitive)
          );
        })
      }
      textSx={{ backgroundColor: theme.palette.background.drawer }}
      fullWidth
      placeholder={`${t('messages.search')}...`}
    />
  );
};
