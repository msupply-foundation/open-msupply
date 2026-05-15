import React from 'react';
import { Box, Typography } from '@openmsupply-client/common';

export const ReportingDailyPage: React.FC = () => (
  <Box padding={3} display="flex" flexDirection="column" gap={1}>
    <Typography variant="h5">Reporting / Daily</Typography>
    <Typography variant="body1">
      Bare-bones plugin page: no AppBar, Toolbar, or Footer chrome. The
      surrounding host shell is left empty.
    </Typography>
  </Box>
);
