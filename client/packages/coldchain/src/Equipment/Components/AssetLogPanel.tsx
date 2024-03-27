import React, { FC, PropsWithChildren } from 'react';

import {
  styled,
  TabPanel,
  Box,
  InsertAssetLogInput,
} from '@openmsupply-client/common';

const StyledTabPanel = styled(TabPanel)({
  height: '100%',
  padding: 0,
  width: '100%',
});

const StyledTabContainer = styled(Box)(({ theme }) => ({
  borderColor: theme.palette.divider,
  flexDirection: 'column',
  display: 'flex',
}));

export interface AssetLogPanel {
  value: string;
  draft: Partial<InsertAssetLogInput>;
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
