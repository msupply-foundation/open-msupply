import React from 'react';
import {
  ButtonWithIcon,
  Menu,
  MenuItem,
  TranslateIcon,
  useI18N,
  useTranslation,
  useNavigate,
} from '@openmsupply-client/common';
import { SupportedLocales } from '@common/intl';

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

  const i18n = useI18N();
  const t = useTranslation('common');
  const setLanguage = (language: SupportedLocales) => {
    i18n.changeLanguage(language);
    handleClose();
  };

  const LanguageMenuItem = React.forwardRef(
    (props: LanguageMenuItemProps, ref: React.ForwardedRef<HTMLLIElement>) => {
      const { children, language } = props;
      const selected = language === i18n.language;
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
      <ButtonWithIcon
        onClick={handleClick}
        Icon={<TranslateIcon />}
        label={t('button.language')}
      />

      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <LanguageMenuItem language="en">English</LanguageMenuItem>
        <LanguageMenuItem language="fr">French</LanguageMenuItem>
        <LanguageMenuItem language="ar">Arabic</LanguageMenuItem>
      </Menu>
    </div>
  );
};
