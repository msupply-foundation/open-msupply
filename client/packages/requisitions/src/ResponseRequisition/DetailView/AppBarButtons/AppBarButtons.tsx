import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  LoadingButton,
  PrinterIcon,
  ReportCategory,
  useDetailPanel,
  useTranslation,
} from '@openmsupply-client/common';
import { CreateShipmentButton } from './CreateShipmentButton';
import {
  ReportRowFragment,
  ReportSelector,
  usePrintReport,
} from '@openmsupply-client/system';
import { useResponse } from '../../api';

export const AppBarButtonsComponent = () => {
  const { OpenButton } = useDetailPanel();
  const { data } = useResponse();
  const { print, isPrinting } = usePrintReport();
  const t = useTranslation('common');

  const printReport = (report: ReportRowFragment) => {
    if (!data) return;
    print({ reportId: report.id, dataId: data?.id || '' });
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <CreateShipmentButton />
        <ReportSelector
          category={ReportCategory.Requisition}
          onClick={printReport}
        >
          <LoadingButton
            variant="outlined"
            startIcon={<PrinterIcon />}
            isLoading={isPrinting}
          >
            {t('button.print')}
          </LoadingButton>
        </ReportSelector>
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
