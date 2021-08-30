import React from 'react';
import {
  Button,
  Menu,
  MenuItem,
  TranslateIcon,
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

  const LanguageMenuItem = React.forwardRef(
    (props: LanguageMenuItemProps, _ref) => {
      const { children, language } = props;
      const selected = language === locale;
      return (
        <MenuItem selected={selected} onClick={() => setLanguage(language)}>
          {children}
        </MenuItem>
      );
    }
  );

  return (
    <div>
      <Button
        onClick={handleClick}
        icon={<TranslateIcon />}
        labelKey="button.language"
      />
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
