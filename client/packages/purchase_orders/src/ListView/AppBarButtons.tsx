import React from 'react';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  FileUtils,
  LoadingButton,
  EnvUtils,
  Platform,
  useCallbackWithPermission,
  UserPermission,
  ToggleState,
  useNotification,
  useToggle,
} from '@openmsupply-client/common';
import { SupplierSearchModal } from '@openmsupply-client/system';
import { ListParams, usePurchaseOrderList } from '../api';

export const AppBarButtonsComponent = () => {
  const t = useTranslation();
  const modalController = useToggle();

  const { success, error } = useNotification();

  const handleSupplierSelected = () => {
    console.log('Selected');
    // TO-DO: create PO
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-purchase-order')}
          onClick={modalController.toggleOn}
        />
        <SupplierSearchModal
          open={modalController.isOn}
          onClose={modalController.toggleOff}
          onChange={handleSupplierSelected}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
