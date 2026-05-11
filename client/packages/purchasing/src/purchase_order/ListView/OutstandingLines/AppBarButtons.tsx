import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
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

  const getCsvData = () =>
    data?.length ? outstandingLinesToCsv(t, data) : null;

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ExportSelector
          getCsvData={getCsvData}
          filename={t('filename.outstanding-purchase-order-lines')}
          isLoading={isLoading}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
