import React, { useState } from 'react';
import {
  Grid,
  ReportContext,
  useAuthContext,
  useTranslation,
} from '@openmsupply-client/common';
import { BarIcon, InvoiceIcon, TrendingDownIcon } from '@common/icons';
import { useReportList, ReportRowFragment } from '@openmsupply-client/system';
import { AppBarButtons } from './AppBarButton';
import { SidePanel } from './SidePanel';
import { ReportWidget } from '../components';

export const ListView = () => {
  const t = useTranslation('reports');
  const { store } = useAuthContext();
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
  const programReports = data?.nodes?.filter(
    report =>
      report?.subContext === 'HIVCareProgram' &&
      report?.context === ReportContext.Dispensary
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
        {store?.preferences?.omProgramModule && (
          <ReportWidget
            title={t('label.programs')}
            Icon={InvoiceIcon}
            reports={programReports}
            onReportClick={onReportClick}
            reportWithArgs={reportWithArgs}
            setReportWithArgs={setReportWithArgs}
          />
        )}
      </Grid>

      <AppBarButtons />
      <SidePanel />
    </>
  );
};
