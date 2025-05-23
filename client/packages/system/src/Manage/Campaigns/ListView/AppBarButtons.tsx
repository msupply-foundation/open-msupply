import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  ButtonWithIcon,
  useTranslation,
  PlusCircleIcon,
} from '@openmsupply-client/common';

export const AppBarButtonsComponent = ({ onOpen }: { onOpen: () => void }) => {
  const t = useTranslation();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.add-new-campaign')}
          onClick={onOpen}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
