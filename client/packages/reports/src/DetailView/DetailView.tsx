import React, { useCallback, useEffect, useState } from 'react';
import {
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

export const DetailView = () => {
  const { id } = useParams();
  const { data: report } = useReport(id ?? '');
  const t = useTranslation();

  const {
    urlQuery: { reportArgs: reportArgsJson },
  } = useUrlQuery({ skipParse: ['reportArgs'] });

  const reportArgs =
    (reportArgsJson && JSON.parse(reportArgsJson.toString())) || undefined;

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
  const [errorMessage, setErrorMessage] = useState('');
  const { mutateAsync } = useGenerateReport();
  const [fileId, setFileId] = useState<string | undefined>();
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
      setFileId(undefined);
      try {
        const result = await mutateAsync({
          reportId: report.id,
          args,
          dataId: '',
        });
        if (result?.__typename === 'PrintReportNode') {
          setFileId(result.fileId);
        }

        if (result?.__typename === 'PrintReportError') {
          const err = result.error;

          if (err.__typename === 'FailedToFetchReportData') {
            const errors = err.errors;

            if (errors[0].extensions?.details?.includes('permission')) {
              setErrorMessage(t('error.no-permission-report'));
            } else {
              setErrorMessage(t('error.failed-to-generate-report'));
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
        setFileId(result.fileId);
      }

      if (result?.__typename === 'PrintReportError') {
        const err = result.error;

        if (err.__typename === 'FailedToFetchReportData') {
          const errors = err.errors;

          if (errors[0].extensions?.details?.includes('permission')) {
            setErrorMessage(t('error.no-permission-report'));
          } else {
            setErrorMessage(t('error.failed-to-generate-excel'));
          }
        } else {
          noOtherVariants(err.__typename);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }, [reportArgs]);

  const url = `${Environment.FILE_URL}${fileId}`;

  return (
    <>
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
        onReset={() => setReportWithArgs(undefined)}
        onArgumentsSelected={generateReport}
      />

      {!fileId ? (
        <NothingHere body={errorMessage} />
      ) : (
        <iframe src={url} width="100%" style={{ borderWidth: 0 }} />
      )}
    </>
  );
};
