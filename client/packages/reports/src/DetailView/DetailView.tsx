import React, { useCallback, useEffect, useState } from 'react';
import {
  BasicSpinner,
  FileUtils,
  PrintFormat,
  useBreadcrumbs,
  useParams,
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
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { mutateAsync } = useGenerateReport();
  const [fileId, setFileId] = useState<string | undefined>();
  const { print, isPrinting } = usePrintReport();
  const { updateQuery } = useUrlQuery();

  // When reportWithArgs is undefined, args modal is closed
  const [reportWithArgs, setReportWithArgs] = useState<
    ReportRowFragment | undefined
  >();

  useEffect(() => {
    setCustomBreadcrumbs({ 0: report.name ?? '' });

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
      const fileId = await mutateAsync({
        reportId: report.id,
        args,
        dataId: '',
      });
      setFileId(fileId);
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
    const fileId = await mutateAsync({
      reportId: report.id,
      args: reportArgs,
      dataId: '',
      format: PrintFormat.Excel,
    });

    if (!fileId) throw new Error('Error generating Excel report');
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
        report={reportWithArgs}
        onReset={() => setReportWithArgs(undefined)}
        onArgumentsSelected={generateReport}
      />

      {!fileId ? <BasicSpinner /> : <iframe src={url} width="100%" />}
    </>
  );
};
