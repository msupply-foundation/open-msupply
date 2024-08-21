import React from 'react';
import {
  AppBarButtonsPortal,
  DownloadIcon,
  EnvUtils,
  Grid,
  LoadingButton,
  Platform,
  PrinterIcon,
  PrintFormat,
  ReportContext,
  useParams,
  useTranslation,
} from '@openmsupply-client/common';
import {
  ReportRowFragment,
  ReportSelector,
  usePrintReport,
} from '@openmsupply-client/system';
import { useRnRForm } from '../api';
import { JsonData } from '@openmsupply-client/programs';

export const AppBarButtonsComponent = () => {
  const { id = '' } = useParams();
  const {
    query: { data },
  } = useRnRForm({ rnrFormId: id });
  const { print, isPrinting } = usePrintReport();
  const t = useTranslation('reports'); // note: using 'reports' due to issue #4616

  const printReport =
    (format: PrintFormat) =>
    (report: ReportRowFragment, args: JsonData | undefined) => {
      if (!data) return;
      print({
        reportId: report.id,
        dataId: data?.id,
        args,
        format,
      });
    };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ReportSelector
          context={ReportContext.Requisition}
          subContext="R&R"
          onPrint={printReport(PrintFormat.Html)}
        >
          <LoadingButton
            variant="outlined"
            startIcon={<PrinterIcon />}
            isLoading={isPrinting}
          >
            {t('button.print')}
          </LoadingButton>
        </ReportSelector>

        <ReportSelector
          context={ReportContext.Requisition}
          subContext="R&R"
          onPrint={printReport(PrintFormat.Excel)}
        >
          <LoadingButton
            startIcon={<DownloadIcon />}
            variant="outlined"
            disabled={EnvUtils.platform === Platform.Android}
            isLoading={isPrinting}
          >
            {t('button.export')}
          </LoadingButton>
        </ReportSelector>
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
