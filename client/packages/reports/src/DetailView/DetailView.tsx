import React, { useCallback, useEffect, useState } from 'react';
import {
  BasicSpinner,
  FileUtils,
  NothingHere,
  PrintFormat,
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
  const {
    urlQuery: { reportArgs: reportArgsJson },
  } = useUrlQuery({ skipParse: ['reportArgs'] });

  const reportArgs =
    (reportArgsJson && JSON.parse(reportArgsJson.toString())) || undefined;

  return !report?.id ? (
    <BasicSpinner />
  ) : (
    <DetailViewInner report={report} reportArgs={reportArgs} />
  );
};

const DetailViewInner = ({
  report,
  reportArgs,
}: {
  report: ReportRowFragment;
  reportArgs: JsonData;
}) => {
  const { setCustomBreadcrumbs } = useBreadcrumbs(['reports']);
  const [errorMessage, setErrorMessage] = useState('');
  const t = useTranslation('reports');
  const { mutateAsync } = useGenerateReport(setErrorMessage, t);
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
        const fileId = await mutateAsync({
          reportId: report.id,
          args,
          dataId: '',
        });
        setFileId(fileId);
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
      const fileId = await mutateAsync({
        reportId: report.id,
        args: reportArgs,
        dataId: '',
        format: PrintFormat.Excel,
      });
      setFileId(fileId);
    } catch (error) {
      console.error(error);
    }
    const url = `${Environment.FILE_URL}${fileId}`;
    FileUtils.downloadFile(url);
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
