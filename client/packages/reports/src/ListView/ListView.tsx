import React, { useState } from 'react';
import {
  BarIcon,
  Grid,
  ReportContext,
  TrendingDownIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButton';
import { SidePanel } from './SidePanel';
import { ReportWidget } from '../components';
import { useReportList, ReportRowFragment } from '@openmsupply-client/system';

export const ListView = () => {
  const t = useTranslation('reports');
  const { data } = useReportList({
    queryParams: {
      filterBy: {
        context: { equalAny: [ReportContext.Report, ReportContext.Dispensary] },
      },
      sortBy: { key: 'name', direction: 'asc' },
      offset: 0,
    },
  });
  const [reportWithArgs, setReportWithArgs] = useState<
    ReportRowFragment | undefined
  >();
  const stockAndItemReports = data?.nodes?.filter(
    report => report?.subContext === 'StockAndItems'
  );
  const expiringReports = data?.nodes?.filter(
    report => report?.subContext === 'Expiring'
  );
  const onReportClick = (report: ReportRowFragment) => {
    if (report.argumentSchema) {
      setReportWithArgs(report);
    }
  };

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
          onReportClick={onReportClick}
          reportWithArgs={reportWithArgs}
          setReportWithArgs={setReportWithArgs}
        />
        <ReportWidget
          title={t('heading.expiring')}
          Icon={TrendingDownIcon}
          reports={expiringReports}
          onReportClick={onReportClick}
          reportWithArgs={reportWithArgs}
          setReportWithArgs={setReportWithArgs}
        />
      </Grid>

      <AppBarButtons />
      <SidePanel />
    </>
  );
};
