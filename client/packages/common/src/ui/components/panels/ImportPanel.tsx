import React, { FC, PropsWithChildren, useMemo } from 'react';

import { styled, TabPanel, Box } from '@openmsupply-client/common';

export interface ImportPanel {
  tab: string;
}

export const ImportPanel: FC<PropsWithChildren<ImportPanel>> = ({
  tab,
  children,
}) => {
  const StyledTabPanel = useMemo(
    () =>
      styled(TabPanel)({
        height: '100%',
        width: '100%',
      }),
    []
  );

  const StyledTabContainer = useMemo(
    () =>
      styled(Box)(({ theme }) => ({
        borderColor: theme.palette.divider,
        flexDirection: 'column',
        display: 'flex',
      })),
    []
  );
  return (
    <StyledTabPanel value={tab}>
      <StyledTabContainer>{children}</StyledTabContainer>
    </StyledTabPanel>
  );
};
