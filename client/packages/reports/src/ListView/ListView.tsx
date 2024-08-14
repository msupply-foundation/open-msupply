import React, { useCallback, useState } from 'react';
import {
  Grid,
  NothingHere,
  ReportContext,
  RouteBuilder,
  useAuthContext,
  useNavigate,
  useTranslation,
} from '@openmsupply-client/common';
import { BarIcon, InvoiceIcon, TrendingDownIcon } from '@common/icons';
import {
  useReportList,
  ReportRowFragment,
  ReportArgumentsModal,
} from '@openmsupply-client/system';
import { AppBarButtons } from './AppBarButton';
import { SidePanel } from './SidePanel';
import { ReportWidget } from '../components';
import { JsonData } from 'packages/programs/src';
import { AppRoute } from 'packages/config/src';

export const ListView = () => {
  const t = useTranslation('reports');
  const { store } = useAuthContext();
  const navigate = useNavigate();
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

  const reportArgs = useCallback(
    (report: ReportRowFragment, args: JsonData | undefined) => {
      const stringifyArgs = JSON.stringify(args);
      navigate(
        RouteBuilder.create(AppRoute.Reports)
          .addPart(`${report.id}?reportArgs=${stringifyArgs}`)
          .build()
      );
    },
    [navigate]
  );

  if (!stockAndItemReports?.length && !expiringReports?.length) {
    return <NothingHere body={t('message.contact-support')} />;
  }

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
          hasReports={stockAndItemReports?.length !== 0}
        />
        <ReportWidget
          title={t('heading.expiring')}
          Icon={TrendingDownIcon}
          reports={expiringReports}
          onReportClick={onReportClick}
          hasReports={expiringReports?.length !== 0}
        />
        {store?.preferences?.omProgramModule && (
          <ReportWidget
            title={t('label.programs')}
            Icon={InvoiceIcon}
            reports={programReports}
            onReportClick={onReportClick}
            hasReports={programReports?.length !== 0}
          />
        )}
        <ReportArgumentsModal
          key={reportWithArgs?.id}
          report={reportWithArgs}
          onReset={() => setReportWithArgs(undefined)}
          onArgumentsSelected={reportArgs}
        />
      </Grid>

      <AppBarButtons />
      <SidePanel />
    </>
  );
};
