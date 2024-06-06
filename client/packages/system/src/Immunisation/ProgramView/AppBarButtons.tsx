import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  ButtonWithIcon,
  PlusCircleIcon,
} from '@openmsupply-client/common';

interface ProgramAppBarButtonsProps {
  onCreate: () => void;
}

export const AppBarButtons = ({}: ProgramAppBarButtonsProps) => {
  const t = useTranslation('coldchain');

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.add-new-immunisation')}
          onClick={() => {
            console.info('create new immunisation');
          }}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
