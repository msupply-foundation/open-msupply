import React, { FC } from 'react';

import {
  DownloadIcon,
  PrinterIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';

export const AppBarButtons: FC = () => {
  const { info, success } = useNotification();
  const t = useTranslation('inventory');

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
