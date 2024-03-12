import React, { FC, PropsWithChildren } from 'react';

import { styled, TabPanel, Box } from '@openmsupply-client/common';
import { AssetLogFragment } from '../api';

const StyledTabPanel = styled(TabPanel)({
  height: '100%',
  padding: '0px 24px',
  minWidth: '150px',
});

const StyledTabContainer = styled(Box)(({ theme }) => ({
  borderColor: theme.palette.divider,
  flexDirection: 'column',
  display: 'flex',
}));

export interface AssetLogPanel {
  value: string;
  draft: Partial<AssetLogFragment>;
}

export const AssetLogPanel: FC<PropsWithChildren<AssetLogPanel>> = ({
  value,
  children,
}) => {
  return (
    <StyledTabPanel value={value}>
      <StyledTabContainer>{children}</StyledTabContainer>
    </StyledTabPanel>
  );
};
