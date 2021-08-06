import React from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  TranslateIcon,
} from '@openmsupply-client/common';
import { SupportedLocales } from '@openmsupply-client/common/src/intl/intlHelpers';

// import { useServiceContext } from './Service';
interface LanguageMenuProps { setLocale: (locale: SupportedLocales) => void, locale: SupportedLocales };

export const LanguageMenu: React.FC<LanguageMenuProps> = ({ setLocale, locale }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  // const serviceContext = useServiceContext();
  // const {setLocale} = useIntlProvider(); 

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const setLanguage = (locale: SupportedLocales) => {
    // serviceContext.setService({ locale });
    setLocale(locale);
    handleClose();
  };

  return (
    <div>
      <IconButton onClick={handleClick}>
        <TranslateIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem selected={locale === 'en'} onClick={() => setLanguage('en')}>English</MenuItem>
        <MenuItem selected={locale === 'fr'} onClick={() => setLanguage('fr')}>French</MenuItem>
        <MenuItem selected={locale === 'pt'} onClick={() => setLanguage('pt')}>Portuguese</MenuItem>
      </Menu>
    </div>
  );
};
