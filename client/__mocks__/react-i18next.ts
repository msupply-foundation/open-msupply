import React from 'react';
const reactI18Next: any = jest.createMockFromModule('react-i18next');

reactI18Next.useTranslation = () => {
  const [language, setLanguage] = React.useState('en');
  return {
    t: (str: string) => str,
    i18n: {
      language,
      changeLanguage: (ln: string) => {
        setLanguage(ln);
        return new Promise(() => {});
      },
    },
  };
};

module.exports = reactI18Next;

export default {};
