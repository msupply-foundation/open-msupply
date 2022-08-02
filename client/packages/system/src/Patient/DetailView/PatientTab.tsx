import React, { FC, PropsWithChildren } from 'react';
import { Box, styled, TabPanel } from '@openmsupply-client/common';

interface PatientTabProps {
  value: string;
}

const StyledTabPanel = styled(TabPanel)({
  height: '100%',
  flex: 1,
});

const StyledTabContainer = styled(Box)(({ theme }) => ({
  borderColor: theme.palette.divider,
  flexDirection: 'row',
  display: 'flex',
}));

export const PatientTab: FC<PropsWithChildren<PatientTabProps>> = ({
  value,
  children,
}) => (
  <StyledTabPanel value={value}>
    <StyledTabContainer>{children}</StyledTabContainer>
  </StyledTabPanel>
);
