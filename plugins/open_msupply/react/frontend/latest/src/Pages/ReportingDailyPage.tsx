// Demo plugin page — illustrates the new `pages` slot in the open-mSupply plugin
// infrastructure. See https://github.com/msupply-foundation/open-msupply/pull/11702
// for the host-side implementation this page pairs with.

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
