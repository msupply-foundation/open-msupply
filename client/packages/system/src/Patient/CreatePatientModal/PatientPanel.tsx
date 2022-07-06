import React, { FC, PropsWithChildren } from 'react';

import { styled, TabPanel, Box } from '@openmsupply-client/common';
import { CreateNewPatient } from '../hooks';

const StyledTabPanel = styled(TabPanel)({
  height: '100%',
});

const StyledTabContainer = styled(Box)(({ theme }) => ({
  borderColor: theme.palette.divider,
  flexDirection: 'column',
  display: 'flex',
}));

export interface PatientPanel {
  value: string;
  patient?: CreateNewPatient;
}

export const PatientPanel: FC<PropsWithChildren<PatientPanel>> = ({
  value,
  children,
}) => {
  return (
    <StyledTabPanel value={value}>
      <StyledTabContainer>{children}</StyledTabContainer>
    </StyledTabPanel>
  );
};
