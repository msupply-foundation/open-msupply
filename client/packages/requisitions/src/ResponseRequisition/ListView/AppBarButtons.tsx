import React, { FC } from 'react';
import {
  DownloadIcon,
  useNotification,
  useTranslation,
  AppBarButtonsPortal,
  Grid,
  ButtonWithIcon,
} from '@openmsupply-client/common';

export const AppBarButtons: FC = () => {
  const { success } = useNotification();
  const t = useTranslation('common');

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<DownloadIcon />}
          label={t('button.export')}
          onClick={success('Downloaded successfully')}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
