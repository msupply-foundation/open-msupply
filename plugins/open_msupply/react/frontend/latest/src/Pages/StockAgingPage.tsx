// Demo plugin page — illustrates the new `pages` slot in the open-mSupply plugin
// infrastructure. See https://github.com/msupply-foundation/open-msupply/pull/11702
// for the host-side implementation this page pairs with.

import React from 'react';
import {
  AppBarButtonsPortal,
  AppBarContentPortal,
  AppFooterPortal,
  Box,
  ButtonWithIcon,
  PrinterIcon,
  Toolbar,
  Typography,
} from '@openmsupply-client/common';

export const StockAgingPage: React.FC = () => (
  <>
    <AppBarButtonsPortal>
      <ButtonWithIcon
        label="Print"
        onClick={() => window.print()}
        Icon={<PrinterIcon />}
      />
    </AppBarButtonsPortal>
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Typography variant="h5">Stock aging</Typography>
    </AppBarContentPortal>
    <Box display="flex" flexDirection="column" flex={1} padding={2}>
      <Toolbar disableGutters>
        <Typography variant="subtitle1">
          Plugin-supplied page rendered inside the Inventory section.
        </Typography>
      </Toolbar>
      <Box>Page body content goes here.</Box>
    </Box>
    <AppFooterPortal
      Content={
        <Box display="flex" alignItems="center" height={56} paddingX={2}>
          <Typography variant="caption">
            Stock aging plugin footer area.
          </Typography>
        </Box>
      }
    />
  </>
);
