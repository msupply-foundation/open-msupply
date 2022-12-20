import React, { FC, PropsWithChildren } from 'react';
import { Box, Theme } from '@mui/material';
import { useMatch } from 'react-router-dom';
import { useDrawer } from '@common/hooks';

export const AppNavSection: FC<
  PropsWithChildren<{ isActive: boolean; to: string }>
> = ({ children, isActive, to }) => {
  const { isOpen } = useDrawer();
  const backgroundColor = (theme: Theme) =>
    useMatch({ path: `${to}/*` })
      ? theme.palette.background.toolbar
      : 'transparent';
  const sx = isActive ? { borderRadius: 2, boxShadow: 3, backgroundColor } : {};

  // the div is picking up styles from parent objects and ends up wider than it should be
  return isOpen ? <Box sx={sx}>{children}</Box> : <>{children}</>;
};
