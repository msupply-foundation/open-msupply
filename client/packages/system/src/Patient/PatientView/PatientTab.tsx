import React, { FC, PropsWithChildren } from 'react';
import { Box, styled, TabPanel } from '@openmsupply-client/common';

interface PatientTabProps {
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

export const PatientTab: FC<PropsWithChildren<PatientTabProps>> = ({
  children,
  padding,
  value,
}) => (
  <StyledTabPanel value={value} sx={{ padding }}>
    <StyledTabContainer>{children}</StyledTabContainer>
  </StyledTabPanel>
);
