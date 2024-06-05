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
  const t = useTranslation('coldchain');

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          startIcon={<PlusCircleIcon />}
          variant="outlined"
          onClick={onCreate}
          Icon={<PlusCircleIcon />}
          label={t('button.add-new-program')}
        >
          {t('button.add-new-program')}
        </ButtonWithIcon>
      </Grid>
    </AppBarButtonsPortal>
  );
};
