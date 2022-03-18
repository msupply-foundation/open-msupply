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
import {
  ReportRowFragment,
  ReportSelector,
  usePrintReport,
} from '@openmsupply-client/system';
import { CreateShipmentButton } from './CreateShipmentButton';
import { SupplyRequestedQuantityButton } from './SupplyRequestedQuantityButton';
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
        <SupplyRequestedQuantityButton />
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
