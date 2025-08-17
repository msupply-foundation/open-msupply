import React, { useCallback, useState } from 'react';
import {
  BasicSpinner,
  Grid,
  NothingHere,
  ReportContext,
  RouteBuilder,
  useAuthContext,
  useNavigate,
  useTranslation,
} from '@openmsupply-client/common';
import { BarIcon, InvoiceIcon, TruckIcon } from '@common/icons';
import {
  useReportList,
  ReportRowFragment,
  ReportArgumentsModal,
} from '@openmsupply-client/system';
import { AppBarButtons } from './AppBarButton';
import { SidePanel } from './SidePanel';
import { ReportWidget } from '../components';
import { JsonData } from '@openmsupply-client/programs';
import { AppRoute } from '@openmsupply-client/config';
import { categoriseReports } from './utils';

export const ListView = () => {
  const t = useTranslation();
  const { store } = useAuthContext();
  const navigate = useNavigate();
  const { data, isLoading } = useReportList({
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

  const categorisedReports = categoriseReports(data?.nodes || []);
  const programReports = store?.preferences?.omProgramModule
    ? categorisedReports.programs
    : [];

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

  if (isLoading) {
    return <BasicSpinner messageKey="loading" />;
  }

  if (!categorisedReports.stockAndItems?.length) {
    return <NothingHere body={t('message.contact-support')} />;
  }

  return (
    <>
      <Grid
        container
        sx={{
          paddingBottom: '32px',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridAutoRows: 'minmax(300px, auto)',
          gap: 2,
          m: 2,
        }}
      >
        <ReportWidget
          title={t('heading.stock-and-items')}
          Icon={BarIcon}
          reports={categorisedReports.stockAndItems}
          onReportClick={onReportClick}
          hasReports={!!categorisedReports.stockAndItems.length}
        />
        <ReportWidget
          title={t('distribution')}
          Icon={TruckIcon}
          reports={categorisedReports.distribution}
          onReportClick={onReportClick}
          hasReports={!!categorisedReports.distribution.length}
        />
        <ReportWidget
          title={t('label.programs')}
          Icon={InvoiceIcon}
          reports={programReports}
          onReportClick={onReportClick}
          hasReports={
            !!store?.preferences?.omProgramModule && !!programReports.length
          }
        />
        <ReportWidget
          title={t('heading.other')}
          Icon={InvoiceIcon}
          reports={categorisedReports.other}
          onReportClick={onReportClick}
          hasReports={!!categorisedReports.other.length}
        />
      </Grid>

      <ReportArgumentsModal
        key={reportWithArgs?.id}
        report={reportWithArgs}
        onReset={() => setReportWithArgs(undefined)}
        onArgumentsSelected={reportArgs}
      />
      <AppBarButtons />
      <SidePanel />
    </>
  );
};
