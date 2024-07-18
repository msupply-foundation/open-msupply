import React from 'react';
import {
  BarIcon,
  Grid,
  TrendingDownIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButton';
import { SidePanel } from './SidePanel';
import { useReport } from '@openmsupply-client/system';
import { ReportWidget } from '../components';

export const ListView = () => {
  const t = useTranslation('reports');
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
        <ReportWidget
          title={t('heading.stock-and-items')}
          Icon={BarIcon}
          reports={stockAndItemReports}
        />
        <ReportWidget
          title={t('heading.expiring')}
          Icon={TrendingDownIcon}
          reports={expiringReports}
        />
      </Grid>

      <AppBarButtons />
      <SidePanel />
    </>
  );
};
