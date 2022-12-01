import React, { FC, PropsWithChildren } from 'react';
import { Box, styled } from '@mui/material';
import { TabPanel } from './Tabs';

interface DetailTabProps {
  padding?: number;
  value: string;
}

const StyledTabPanel = styled(TabPanel)({
  height: '100%',
  flex: 1,
  padding: 0,
});

const StyledTabContainer = styled(Box)(({ theme }) => ({
  borderColor: theme.palette.divider,
  flexDirection: 'row',
  display: 'flex',
  height: '100%',
}));

export const ModalTab: FC<PropsWithChildren<DetailTabProps>> = ({
  children,
  padding,
  value,
}) => (
  <StyledTabPanel value={value} sx={{ padding, width: '100%' }}>
    <StyledTabContainer>{children}</StyledTabContainer>
  </StyledTabPanel>
);
