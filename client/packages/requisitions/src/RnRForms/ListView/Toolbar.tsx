import React from 'react';
import {
  AppBarContentPortal,
} from '@openmsupply-client/common';

export const Toolbar = () => {

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        display: 'flex',
      }}
    >
      {/* TODO: filtering */}
    </AppBarContentPortal>
  );
};
