import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
} from '@openmsupply-client/common';
import { useIsStocktakeDisabled } from '../api';

interface AppBarButtonProps {
  onAddItem: (newState: boolean) => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
}) => {
  const isDisabled = useIsStocktakeDisabled();
  const { OpenButton } = useDetailPanel();
  const t = useTranslation('common');

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={() => onAddItem(true)}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
