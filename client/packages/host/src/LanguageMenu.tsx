import React from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Translate,
  useHostContext,
} from '@openmsupply-client/common';
import { SupportedLocales } from '@openmsupply-client/common/src/intl/intlHelpers';

interface LanguageMenuItemProps {
  children: string;
  language: SupportedLocales;
}

export const LanguageMenu: React.FC = () => {
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

  const LanguageMenuItem = (props: LanguageMenuItemProps) => {
    const { children, language } = props;
    const selected = language === locale;
    return (
      <MenuItem selected={selected} onClick={() => setLanguage(language)}>
        {children}
      </MenuItem>
    );
  };

  return (
    <div>
      <IconButton onClick={handleClick}>
        <Translate />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <LanguageMenuItem language="en">English</LanguageMenuItem>
        <LanguageMenuItem language="fr">French</LanguageMenuItem>
        <LanguageMenuItem language="pt">Portuguese</LanguageMenuItem>
      </Menu>
    </div>
  );
};
