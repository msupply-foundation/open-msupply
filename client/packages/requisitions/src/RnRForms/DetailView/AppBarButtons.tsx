import React from 'react';
import {
  AppBarButtonsPortal,
  EnvUtils,
  Grid,
  Platform,
  PrintFormat,
  ReportContext,
  useDetailPanel,
  useParams,
  useTranslation,
  FullScreenButton,
} from '@openmsupply-client/common';
import {
  ReportRowFragment,
  ReportSelector,
  usePrintReport,
} from '@openmsupply-client/system';
import { useRnRForm } from '../api';
import { JsonData } from '@openmsupply-client/programs';

export const AppBarButtonsComponent = () => {
  const t = useTranslation();
  const { OpenButton } = useDetailPanel();
  const { id = '' } = useParams();
  const {
    query: { data },
  } = useRnRForm({ rnrFormId: id });
  const { print, isPrinting } = usePrintReport();

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
        <FullScreenButton />
        <ReportSelector
          context={ReportContext.Requisition}
          subContext="R&R"
          onPrint={printReport(PrintFormat.Html)}
          isPrinting={isPrinting}
          buttonLabel={t('button.print')}
        />
        <ReportSelector
          context={ReportContext.Requisition}
          subContext="R&R"
          onPrint={printReport(PrintFormat.Excel)}
          disabled={EnvUtils.platform === Platform.Android}
          isPrinting={isPrinting}
          buttonLabel={t('button.export')}
        />

        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
