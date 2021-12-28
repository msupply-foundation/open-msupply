import React, { FC } from 'react';

import {
  styled,
  TabPanel,
  useColumns,
  Box,
  DataTable,
  alpha,
  Column,
} from '@openmsupply-client/common';
import { DraftInboundLine } from './InboundLineEdit';

const StyledTabPanel = styled(TabPanel)({
  height: '100%',
});

const StyledTabContainer = styled(Box)(({ theme }) => ({
  height: 300,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: theme.palette.divider,
  borderRadius: '20px',
  flexDirection: 'row',
  display: 'flex',
}));

const StyledStaticArea = styled(Box)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.menu, 0.4),
  display: 'flex',
  flexDirection: 'column',
}));

interface InboundLineEditPanel {
  value: string;
  lines: DraftInboundLine[];
}

export const InboundLineEditPanel: FC<InboundLineEditPanel> = ({
  lines,
  value,
  children,
}) => {
  const columns = useColumns([
    ['batch', { width: 100 }],
    ['expiryDate', { width: 100 }],
  ]) as [Column<DraftInboundLine>, Column<DraftInboundLine>];

  return (
    <StyledTabPanel value={value}>
      <StyledTabContainer>
        <StyledStaticArea>
          <DataTable dense columns={columns} data={lines} />
        </StyledStaticArea>
        {children}
      </StyledTabContainer>
    </StyledTabPanel>
  );
};
