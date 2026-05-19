import React from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
  useNavigate,
  useTranslation,
} from '@openmsupply-client/common';

export const AppBarButtons = () => {
  const t = useTranslation();
  const navigate = useNavigate();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-property')}
          onClick={() => navigate('new')}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
