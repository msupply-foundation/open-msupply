import React from 'react';
import { Grid } from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButton';
import { SidePanel } from './SidePanel';
import { StockAndItemWidget } from './StockAndItemWidget';
import { useReport } from '@openmsupply-client/system';
import { ExpiringWidget } from './ExpiringWidget';

export const ListView = () => {
  const { data } = useReport.document.list({});
  const stockAndItemReports = data?.nodes?.filter(
    report => report?.subContext === 'StockAndItems'
  );
  const expiringReports = data?.nodes?.filter(
    report => report?.subContext === 'Expiring'
  );

  return (
    <>
      <Grid
        container
        sx={{
          backgroundColor: 'background.toolbar',
          paddingBottom: '32px',
        }}
        justifyContent="space-evenly"
      >
        <StockAndItemWidget reports={stockAndItemReports} />
        <ExpiringWidget reports={expiringReports} />
      </Grid>

      <AppBarButtons />
      <SidePanel />
    </>
  );
};
