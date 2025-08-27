import React, { memo, ReactElement } from 'react';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';

interface AppBarButtonsComponentProps {
  onOpen: () => void;
}

const AppBarButtonsComponent = ({
  onOpen,
}: AppBarButtonsComponentProps): ReactElement => {
  const t = useTranslation();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-sync-message')}
          onClick={() => onOpen()}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = memo(AppBarButtonsComponent);
