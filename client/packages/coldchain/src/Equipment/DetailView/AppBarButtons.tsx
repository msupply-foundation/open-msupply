import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  PrinterIcon,
  LoadingButton,
  usePrinter,
} from '@openmsupply-client/common';
import { useAssets } from '../api';
import { UpdateStatusButton } from './UpdateStatusButton';
import { Environment } from '@openmsupply-client/config';

export const AppBarButtonsComponent = () => {
  const { data } = useAssets.document.get();
  const t = useTranslation();
  const { data: settings } = useAssets.utils.labelPrinterSettings();

  const { isPrinting, print, DisabledNotification } = usePrinter(settings);

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const date = new Date().toLocaleDateString();

    print(
      {
        endpoint: Environment.PRINT_LABEL_QR,
        payload: {
          code: data?.id,
          assetNumber: `${data?.assetNumber ?? ''}`,
          datePrinted: `${date}`,
        },
      },
      e
    );
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <UpdateStatusButton assetId={data?.id} />
        <LoadingButton
          startIcon={<PrinterIcon />}
          isLoading={isPrinting}
          onClick={onClick}
          label={t('button.print-asset-label')}
          variant="outlined"
        />
      </Grid>
      <DisabledNotification />
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
