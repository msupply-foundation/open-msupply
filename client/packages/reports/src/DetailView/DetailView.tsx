import React, { useCallback, useEffect, useState } from 'react';
import {
  BasicSpinner,
  LocaleKey,
  noOtherVariants,
  NothingHere,
  PrintFormat,
  TypedTFunction,
  useBreadcrumbs,
  useParams,
  useTranslation,
  useUrlQuery,
} from '@openmsupply-client/common';
import {
  ReportArgumentsModal,
  ReportRowFragment,
  useGenerateReport,
  usePrintReport,
  useReport,
} from '@openmsupply-client/system';
import { Environment } from '@openmsupply-client/config';
import { AppBarButtons } from './AppBarButton';
import { JsonData } from '@openmsupply-client/programs';
import { Toolbar } from './Toolbar';

export const DetailView = () => {
  const { id } = useParams();
  const { data: report, isLoading } = useReport(id ?? '');
  const t = useTranslation();

  const {
    urlQuery: { reportArgs: reportArgsJson },
  } = useUrlQuery({ skipParse: ['reportArgs'] });

  const reportArgs =
    (reportArgsJson && JSON.parse(reportArgsJson.toString())) || undefined;
  if (isLoading) {
    return <BasicSpinner messageKey="loading" />;
  }

  return !report?.id ? (
    <NothingHere body={t('error.report-does-not-exist')} />
  ) : (
    <DetailViewInner report={report} reportArgs={reportArgs} t={t} />
  );
};

const DetailViewInner = ({
  report,
  reportArgs,
  t,
}: {
  report: ReportRowFragment;
  reportArgs: JsonData;
  t: TypedTFunction<LocaleKey>;
}) => {
  const { setCustomBreadcrumbs } = useBreadcrumbs(['reports']);
  const [state, setState] = useState<
    | { s: 'loading' }
    | { s: 'error'; errorMessage: string }
    | { s: 'loaded'; fileId: string }
  >({ s: 'loading' });
  const { mutateAsync } = useGenerateReport();

  const { print, isPrinting } = usePrintReport();
  const { updateQuery } = useUrlQuery();

  // When reportWithArgs is undefined, args modal is closed
  const [reportWithArgs, setReportWithArgs] = useState<
    ReportRowFragment | undefined
  >();

  useEffect(() => {
    setCustomBreadcrumbs({ 1: report.name ?? '' });

    // Initial report generation
    if (!report.argumentSchema) {
      generateReport(report, {});
      return;
    }

    if (!!reportArgs) {
      generateReport(report, reportArgs, false);
      return;
    }

    // No urlQuery/reportArgs parameters exist, open modal
    openReportArgumentsModal();
  }, []);

  const generateReport = useCallback(
    async (
      report: ReportRowFragment,
      args: JsonData,
      shouldUpdateQuery = true
    ) => {
      if (shouldUpdateQuery) {
        updateQuery({ reportArgs: JSON.stringify(args) });
      }
      setState({ s: 'loading' });
      try {
        const result = await mutateAsync({
          reportId: report.id,
          args,
          dataId: '',
        });
        if (result?.__typename === 'PrintReportNode') {
          setState({ s: 'loaded', fileId: result.fileId });
        }

        if (result?.__typename === 'PrintReportError') {
          const err = result.error;

          if (err.__typename === 'FailedToFetchReportData') {
            const errors = err.errors;

            if (errors[0].extensions?.details?.includes('permission')) {
              setState({
                s: 'error',
                errorMessage: t('error.no-permission-report'),
              });
            } else {
              setState({
                s: 'error',
                errorMessage: t('error.failed-to-generate-report'),
              });
            }
          } else {
            noOtherVariants(err.__typename);
          }
        }
      } catch (error) {
        console.error(error);
      }
    },
    []
  );

  const openReportArgumentsModal = useCallback(() => {
    setReportWithArgs(report);
  }, []);

  const printReport = useCallback(() => {
    print({
      reportId: report.id,
      dataId: '',
      args: reportArgs,
    });
  }, [reportArgs]);

  const exportExcelReport = useCallback(async () => {
    try {
      const result = await mutateAsync({
        reportId: report.id,
        args: reportArgs,
        dataId: '',
        format: PrintFormat.Excel,
      });
      if (result?.__typename === 'PrintReportNode') {
        // Setting iframe url with response != html disposition, causes iframe to 'download' this file
        setState({ s: 'loaded', fileId: result.fileId });
      }

      if (result?.__typename === 'PrintReportError') {
        const err = result.error;

        if (err.__typename === 'FailedToFetchReportData') {
          const errors = err.errors;

          if (errors[0].extensions?.details?.includes('permission')) {
            setState({
              s: 'error',
              errorMessage: t('error.no-permission-report'),
            });
          } else {
            setState({
              s: 'error',
              errorMessage: t('error.no-permission-report'),
            });
          }
        } else {
          noOtherVariants(err.__typename);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }, [reportArgs]);

  return (
    <>
      <Toolbar reportName={report.name} isCustom={report.isCustom} />
      <AppBarButtons
        isFilterDisabled={!report?.argumentSchema}
        onFilterOpen={openReportArgumentsModal}
        printReport={printReport}
        exportReport={exportExcelReport}
        isPrinting={isPrinting}
      />
      <ReportArgumentsModal
        key={report.id}
        report={reportWithArgs}
        onReset={() => {
          setReportWithArgs(undefined);
        }}
        onArgumentsSelected={generateReport}
      />
      {state.s === 'loading' && (
        <BasicSpinner messageKey="messages.loading-report"></BasicSpinner>
      )}
      {state.s === 'loaded' && (
        <iframe
          src={`${Environment.FILE_URL}${state.fileId}`}
          width="100%"
          style={{ borderWidth: 0 }}
        />
      )}
      {state.s === 'error' && <NothingHere body={state.errorMessage} />}
    </>
  );
};
