import React from 'react';
import {
  Button,
  Menu,
  MenuItem,
  Translate,
  useHostContext,
} from '@openmsupply-client/common';
import { SupportedLocales } from '@openmsupply-client/common/src/intl/intlHelpers';
import { useNavigate } from 'react-router';

interface LanguageMenuItemProps {
  children: string;
  language: SupportedLocales;
}

export const LanguageMenu: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    navigate(0);
  };

  const { locale, setLocale } = useHostContext();
  const setLanguage = (language: SupportedLocales) => {
    setLocale(language);
    handleClose();
  };

  const LanguageMenuItem = React.forwardRef(
    (props: LanguageMenuItemProps, ref: React.ForwardedRef<HTMLLIElement>) => {
      const { children, language } = props;
      const selected = language === locale;
      return (
        <MenuItem
          selected={selected}
          onClick={() => setLanguage(language)}
          ref={ref}
        >
          {children}
        </MenuItem>
      );
    }
  );

  return (
    <div>
      <Button
        onClick={handleClick}
        icon={<Translate />}
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
        <LanguageMenuItem language="ar">Arabic</LanguageMenuItem>
      </Menu>
    </div>
  );
};
