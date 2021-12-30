import React, { FC } from 'react';

import {
  styled,
  TabPanel,
  useColumns,
  Box,
  DataTable,
  alpha,
  TextInputCell,
  getExpiryDateInputColumn,
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
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void;
}

const expiryInputColumn = getExpiryDateInputColumn<DraftInboundLine>();

export const InboundLineEditPanel: FC<InboundLineEditPanel> = ({
  lines,
  value,
  updateDraftLine,
  children,
}) => {
  const columns = useColumns<DraftInboundLine>(
    [
      ['batch', { width: 150, Cell: TextInputCell, setter: updateDraftLine }],
      [expiryInputColumn, { width: 150, setter: updateDraftLine }],
    ],
    {},
    [updateDraftLine]
  );

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
