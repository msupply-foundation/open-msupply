import React from 'react';
import {
  useNavigate,
  Select,
  MenuItem,
  Option,
  LocalStorage,
} from '@openmsupply-client/common';
import { IntlUtils, SupportedLocales } from '@common/intl';

export const LanguageMenu: React.FC = () => {
  const navigate = useNavigate();
  const i18n = IntlUtils.useI18N();
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    i18n.changeLanguage(value);
    LocalStorage.setItem('/localisation/locale', value as SupportedLocales);
    navigate(0);
  };

  const renderOption = (option: Option) => (
    <MenuItem
      key={option.value}
      value={option.value}
      sx={option.value === 'ar' ? { justifyContent: 'flex-end' } : {}}
    >
      {option.label}
    </MenuItem>
  );

  return (
    <Select
      onChange={handleChange}
      options={IntlUtils.languageOptions}
      value={i18n.language}
      renderOption={renderOption}
    />
  );
};
