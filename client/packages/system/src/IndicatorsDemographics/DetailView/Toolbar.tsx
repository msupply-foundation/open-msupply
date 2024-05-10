import React, { FC } from 'react';
import { AppBarContentPortal, Box } from '@openmsupply-client/common';
export const Toolbar: FC = () => {
  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Box
        paddingLeft={4}
        display="flex"
        flex={1}
        alignItems="flex-start"
      ></Box>
    </AppBarContentPortal>
  );
};
