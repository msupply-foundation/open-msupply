import React, { FC, PropsWithChildren } from 'react';
import { Box } from '@mui/material';
import { useDrawer } from '@common/hooks';

export const AppNavSection: FC<
  PropsWithChildren<{ isActive: boolean; to: string }>
> = ({ children, isActive }) => {
  const { isOpen } = useDrawer();

  // the div is picking up styles from parent objects and ends up wider than it should be
  return isOpen ? (
    <Box
      sx={
        isActive
          ? {
              '& .MuiCollapse-root': {
                marginTop: -1.5,
              },
              '& .MuiCollapse-wrapperInner > ul > li.MuiListItem-root': {
                height: 30,
                marginLeft: 1,
              },
            }
          : {}
      }
      className="nav-section"
    >
      {children}
    </Box>
  ) : (
    <>{children}</>
  );
};
