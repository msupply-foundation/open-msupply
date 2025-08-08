import { Box } from '@mui/material';
import React, { FC, PropsWithChildren } from 'react';
import { TabPanel } from '@common/components';

export interface ImportPanel {
  tab: string;
}

export const ImportPanel: FC<PropsWithChildren<ImportPanel>> = ({
  tab,
  children,
}) => {
  return (
    <TabPanel sx={{ height: '100%', width: '100%' }} value={tab}>
      <Box
        sx={{
          borderColor: 'divider',
          flexDirection: 'column',
          display: 'flex',
        }}
      >
        {children}
      </Box>
    </TabPanel>
  );
};
