import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  // useDetailPanel,
  useTranslation,
  useDetailPanel,
} from '@openmsupply-client/common';
// import { AddFromMasterListButton } from './AddFromMasterListButton';

interface AppBarButtonProps {
  isDisabled: boolean;
  onAddItem: () => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
  isDisabled,
}) => {
  const t = useTranslation();
  const { OpenButton } = useDetailPanel();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={onAddItem}
        />

        {/* <AddFromMasterListButton /> */}
        {/* <UseSuggestedQuantityButton /> */}
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
