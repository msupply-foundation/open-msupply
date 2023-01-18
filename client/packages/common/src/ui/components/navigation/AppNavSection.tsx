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
              '& .menu_section_icon': { transform: 'unset' },
              '& .MuiCollapse-root': {
                marginLeft: '48px',
                marginTop: -1.5,
                borderLeft: '1px solid',
                borderColor: 'gray.light',
                paddingLeft: 1,
              },
              '& .MuiCollapse-wrapperInner > ul > li.MuiListItem-root': {
                height: 30,
                '& .MuiListItemIcon-root': { minWidth: 0 },
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
