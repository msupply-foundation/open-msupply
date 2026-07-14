import React, { useMemo } from 'react';
import {
  Autocomplete,
  RegexUtils,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';
import { findMatchingPluralisationKeys } from './helpers';

interface TranslationSearchInputProps {
  onChange: (option: TranslationOption[]) => void;
  existingKeys: string[];
  options: TranslationOption[];
}

export interface TranslationOption {
  key: string;
  default: string;
}

export const TranslationSearchInput = ({
  onChange,
  existingKeys,
  options,
}: TranslationSearchInputProps) => {
  const t = useTranslation();
  const theme = useTheme();

  const nonTranslatedOptions = useMemo(
    () => options.filter(o => !existingKeys.includes(o.key)),
    [options, existingKeys]
  );

  const handleSelect = (option: TranslationOption | null) => {
    if (!option) return;
    const matchingOptions = findMatchingPluralisationKeys(
      option,
      nonTranslatedOptions
    );
    onChange(matchingOptions);
  };

  return (
    <Autocomplete
      onChange={(_, option) => {
        handleSelect(option);
      }}
      options={nonTranslatedOptions}
      sx={{ width: '100%' }}
      renderOption={(props, option) => (
        <li {...props} key={option.key} style={{ display: 'flex', gap: '8px' }}>
          <span style={{ color: 'grey' }}>{option.key}</span>
          {option.default !== option.key && option.default}
        </li>
      )}
      filterOptions={(options, { inputValue }) =>
        options.filter(o => {
          const searchTerm = RegexUtils.escapeChars(inputValue);
          return (
            // Search by key or default translation
            RegexUtils.includes(searchTerm, o.key) ||
            RegexUtils.includes(searchTerm, o.default)
          );
        })
      }
      textSx={{ backgroundColor: theme.palette.background.drawer }}
      fullWidth
      placeholder={t('placeholder.add-translation')}
    />
  );
};
