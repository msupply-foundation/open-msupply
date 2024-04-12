import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  IconButton,
  CloseIcon,
} from '@openmsupply-client/common';

interface AppBarButtonsProps {
  onCreate: () => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonsProps> = ({
  onCreate,
}) => {
  const t = useTranslation('coldchain');

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <IconButton
          color="primary"
          onClick={onCreate}
          icon={<CloseIcon />}
          label={t('button.create-log-reason')}
        />{' '}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
