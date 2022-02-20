import React, { FC } from 'react';
import {
  DownloadIcon,
  PrinterIcon,
  useNotification,
  useTranslation,
  AppBarButtonsPortal,
  Grid,
  ButtonWithIcon,
} from '@openmsupply-client/common';

export const AppBarButtons: FC = () => {
  const { info, success } = useNotification();
  const t = useTranslation('common');

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<DownloadIcon />}
          label={t('button.export')}
          onClick={success('Downloaded successfully')}
        />
        <ButtonWithIcon
          Icon={<PrinterIcon />}
          label={t('button.print')}
          onClick={info('No printer detected')}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
