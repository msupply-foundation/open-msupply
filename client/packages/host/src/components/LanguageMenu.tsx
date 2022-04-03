import React from 'react';
import { IntlUtils, useNavigate, Select } from '@openmsupply-client/common';

export const LanguageMenu: React.FC = () => {
  const navigate = useNavigate();
  const i18n = IntlUtils.useI18N();
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    i18n.changeLanguage(value);
    navigate(0);
  };

  const options = [
    { label: 'Arabic', value: 'ar' },
    { label: 'French', value: 'fr' },
    { label: 'English', value: 'en' },
  ];

  return (
    <Select onChange={handleChange} options={options} value={i18n.language} />
  );
};
