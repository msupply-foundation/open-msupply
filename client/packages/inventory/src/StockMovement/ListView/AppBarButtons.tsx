import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  ButtonWithIcon,
  ModalMode,
  PlusCircleIcon,
  useToggle,
  useTranslation,
} from '@openmsupply-client/common';
import { StockMovementModal } from './StockMovementModal';

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
          <StockMovementModal
            open={modalController.isOn}
            mode={ModalMode.Create}
            onClose={modalController.toggleOff}
          />
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};
