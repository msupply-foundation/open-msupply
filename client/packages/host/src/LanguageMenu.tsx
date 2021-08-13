import React from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  TranslateIcon,
  useHostContext,
} from '@openmsupply-client/common';
import { SupportedLocales } from '@openmsupply-client/common/src/intl/intlHelpers';

interface LanguageMenuProps {
  locale: SupportedLocales;
}

export const LanguageMenu: React.FC<LanguageMenuProps> = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const { locale, setLocale } = useHostContext();
  const setLanguage = (language: SupportedLocales) => {
    setLocale(language);
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
        <MenuItem selected={locale === 'en'} onClick={() => setLanguage('en')}>
          English
        </MenuItem>
        <MenuItem selected={locale === 'fr'} onClick={() => setLanguage('fr')}>
          French
        </MenuItem>
        <MenuItem selected={locale === 'pt'} onClick={() => setLanguage('pt')}>
          Portuguese
        </MenuItem>
      </Menu>
    </div>
  );
};
