import React, { FC } from 'react';
import { AppBarContentPortal } from '@openmsupply-client/common';

export const Toolbar: FC = () => {
  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
      }}
    ></AppBarContentPortal>
  );
};
