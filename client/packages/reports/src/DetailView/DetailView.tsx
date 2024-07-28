import React, { useCallback, useEffect, useState } from 'react';
import {
  BasicSpinner,
  NothingHere,
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
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { data: report, isLoading: isReportLoading } = useReport(id ?? '');
  const { mutateAsync, isLoading } = useGenerateReport();
  const [fileId, setFileId] = useState<string | undefined>();
  const { print, isPrinting } = usePrintReport();

  const {
    updateQuery,
    urlQuery: { reportArgs: reportArgsJson },
  } = useUrlQuery({ skipParse: ['reportArgs'] });
  const reportArgs =
    (reportArgsJson && JSON.parse(reportArgsJson.toString())) || undefined;

  // When reportWithArgs is undefined, args modal is closed
  const [reportWithArgs, setReportWithArgs] = useState<
    ReportRowFragment | undefined
  >();

  useEffect(() => {
    if (!report?.id) return;

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

    // No urlQuery parameters exist, open modal
    openReportArgumentsModal();
  }, [report]);

  const generateReport = useCallback(
    async (
      report: ReportRowFragment,
      args: JsonData,
      shouldUpdateQuery = true
    ) => {
      if (shouldUpdateQuery) {
        updateQuery({ reportArgs: JSON.stringify(args) });
      }
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
    if (!report) return;
    setReportWithArgs(report);
  }, []);

  const printReport = useCallback(() => {
    if (report === undefined) {
      return;
    }

    print({
      reportId: report.id,
      dataId: '',
      args: reportArgs,
    });
  }, [report, reportArgsJson]);

  const url = `${Environment.FILE_URL}${fileId}`;

  return (
    <>
      {(isLoading || isReportLoading) && <BasicSpinner />}
      {fileId ? (
        <>
          <iframe src={url} width="100%" />
          <AppBarButtons
            isDisabled={!report?.argumentSchema}
            onFilterOpen={openReportArgumentsModal}
            printReport={printReport}
            isPrinting={isPrinting}
          />
        </>
      ) : (
        <NothingHere />
      )}
      <ReportArgumentsModal
        report={reportWithArgs}
        onReset={() => setReportWithArgs(undefined)}
        onArgumentsSelected={generateReport}
      />
    </>
  );
};
