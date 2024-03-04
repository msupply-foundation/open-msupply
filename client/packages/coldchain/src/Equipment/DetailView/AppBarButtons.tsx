import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  PrinterIcon,
  ReportContext,
  LoadingButton,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useAssets } from '../api';
import {
  ReportRowFragment,
  ReportSelector,
  useReport,
} from '@openmsupply-client/system';
import { UpdateStatusButton } from './UpdateStatusButton';
import { JsonData } from '@openmsupply-client/programs';

export const AppBarButtonsComponent = ({}) => {
  const { data } = useAssets.document.get();
  const t = useTranslation('common');
  const { print, isPrinting } = useReport.utils.print();
  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();

  const printReport = (
    report: ReportRowFragment,
    args: JsonData | undefined
  ) => {
    if (!data) return;
    print({
      reportId: report.id,
      dataId: data?.id,
      args,
      sort: { key: sortBy.key, desc: sortBy.isDesc },
    });
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <UpdateStatusButton />
        <ReportSelector context={ReportContext.Asset} onPrint={printReport}>
          <LoadingButton
            variant="outlined"
            startIcon={<PrinterIcon />}
            isLoading={isPrinting}
          >
            {t('button.print')}
          </LoadingButton>
        </ReportSelector>
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
