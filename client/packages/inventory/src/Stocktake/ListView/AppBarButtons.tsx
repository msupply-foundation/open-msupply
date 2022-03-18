import React, { FC } from 'react';
import {
  DownloadIcon,
  PrinterIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { CreateStocktakeButton } from './CreateStocktakeButton';

export const AppBarButtons: FC = () => {
  const { info, success } = useNotification();
  const t = useTranslation(['distribution', 'common']);

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <CreateStocktakeButton />
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
