import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  ButtonWithIcon,
  PlusCircleIcon,
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
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.create-log-reason')}
          onClick={onCreate}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
