import React from 'react';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  ButtonWithIcon,
} from '@openmsupply-client/common';

interface ImmunisationsAppBarButtonsProps {
  onCreate: () => void;
}

export const AppBarButtons = ({
  onCreate,
}: ImmunisationsAppBarButtonsProps) => {
  const t = useTranslation('programs');

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          variant="outlined"
          onClick={onCreate}
          Icon={<PlusCircleIcon />}
          label={t('button.add-form')}
        >
          {t('button.add-form')}
        </ButtonWithIcon>
      </Grid>
    </AppBarButtonsPortal>
  );
};
