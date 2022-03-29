import React, { FC } from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { CreateStocktakeButton } from './CreateStocktakeButton';

export const AppBarButtons: FC = () => {
  const { success } = useNotification();
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
      </Grid>
    </AppBarButtonsPortal>
  );
};
