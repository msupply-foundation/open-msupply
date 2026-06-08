import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  ButtonWithIcon,
  PlusCircleIcon,
  useToggle,
  useTranslation,
} from '@openmsupply-client/common';
import { CreateStockMovementModal } from './CreateStockMovementModal';

export const AppBarButtons = () => {
  const t = useTranslation();
  const modalController = useToggle();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('label.new-stock-movement')}
          onClick={modalController.toggleOn}
        />
        {modalController.isOn && (
          <CreateStockMovementModal
            open={modalController.isOn}
            onClose={modalController.toggleOff}
          />
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};
