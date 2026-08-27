import React, { PropsWithChildren } from 'react';
import { Box } from '../../..';

export const ModalPanelArea = ({ children }: PropsWithChildren) => {
  return (
    <Box
      sx={{
        background: theme => theme.palette.background.group.dark,
        borderRadius: 2,
        p: 1,
      }}
    >
      {children}
    </Box>
  );
};
