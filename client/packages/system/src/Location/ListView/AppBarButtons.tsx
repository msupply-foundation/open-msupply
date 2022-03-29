import React, { FC } from 'react';

import {
  DownloadIcon,
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';

interface AppBarButtonsProps {
  onCreate: () => void;
}

export const AppBarButtons: FC<AppBarButtonsProps> = ({ onCreate }) => {
  const { success } = useNotification();
  const t = useTranslation(['inventory', 'common']);

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('label.new-location')}
          onClick={onCreate}
        />
        <ButtonWithIcon
          Icon={<DownloadIcon />}
          label={t('button.export')}
          onClick={success('Downloaded successfully')}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
