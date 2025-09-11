import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  useNotification,
  LoadingButton,
  DownloadIcon,
  useExportCSV,
} from '@openmsupply-client/common';
import { PurchaseOrderLineFragment } from '../../api';
import { outstandingLinesToCsv } from '../../../utils';

interface AppBarButtonProps {
  data?: PurchaseOrderLineFragment[];
  isLoading: boolean;
}

export const AppBarButtonsComponent = ({
  data,
  isLoading,
}: AppBarButtonProps) => {
  const t = useTranslation();
  const exportCsv = useExportCSV();
  const { error } = useNotification();

  const handleCsvExportClick = async () => {
    if (!data || !data.length) return error(t('error.no-data'))();
    const csv = outstandingLinesToCsv(t, data);
    await exportCsv(csv, t('filename.outstanding-purchase-order-lines'));
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <LoadingButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          isLoading={isLoading}
          label={t('button.export')}
          onClick={handleCsvExportClick}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
