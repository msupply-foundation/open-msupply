import React from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  TranslateIcon,
} from '@openmsupply-client/common';
import { useServiceContext } from './Service';

export const LanguageMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const serviceContext = useServiceContext();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const setLanguage = (locale: string) => {
    serviceContext.setService({ title: 'Dashboard', locale });
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
        <MenuItem onClick={() => setLanguage('en')}>English</MenuItem>
        <MenuItem onClick={() => setLanguage('fr')}>French</MenuItem>
        <MenuItem onClick={() => setLanguage('pt')}>Portuguese</MenuItem>
      </Menu>
    </div>
  );
};
