import React from 'react';
import {
  AppBarButtonsPortal,
  DownloadIcon,
  EnvUtils,
  Grid,
  LoadingButton,
  Platform,
  PrinterIcon,
  ReportContext,
  useParams,
  useTranslation,
} from '@openmsupply-client/common';
import {
  ReportRowFragment,
  ReportSelector,
  usePrintReport,
} from '@openmsupply-client/system';
import { useRnRForm } from '../../api';
import { JsonData } from '@openmsupply-client/programs';

export const AppBarButtonsComponent = () => {
  const { id = '' } = useParams();
  const {
    query: { data },
  } = useRnRForm({ rnrFormId: id });
  const { print, isPrinting } = usePrintReport();
  const t = useTranslation();

  const printReport = (
    report: ReportRowFragment,
    args: JsonData | undefined
  ) => {
    if (!data) return;
    print({
      reportId: report.id,
      dataId: data?.id,
      args,
    });
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ReportSelector
          context={ReportContext.Requisition}
          subContext="R&R"
          onPrint={printReport}
        >
          <LoadingButton
            variant="outlined"
            startIcon={<PrinterIcon />}
            isLoading={isPrinting}
          >
            {t('button.print')}
          </LoadingButton>
        </ReportSelector>
        <LoadingButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          onClick={() => {}}
          disabled={EnvUtils.platform === Platform.Android}
          isLoading={false}
        >
          {t('button.export')}
        </LoadingButton>
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
