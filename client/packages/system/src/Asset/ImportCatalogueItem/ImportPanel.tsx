import React, { FC, PropsWithChildren } from 'react';

import { styled, TabPanel, Box } from '@openmsupply-client/common';

const StyledTabPanel = styled(TabPanel)({
  height: '100%',
});

const StyledTabContainer = styled(Box)(({ theme }) => ({
  borderColor: theme.palette.divider,
  flexDirection: 'column',
  display: 'flex',
}));

export interface ImportPanel {
  tab: string;
}

export const ImportPanel: FC<PropsWithChildren<ImportPanel>> = ({
  tab,
  children,
}) => (
  <StyledTabPanel value={tab}>
    <StyledTabContainer>{children}</StyledTabContainer>
  </StyledTabPanel>
);
