import React, { FC, useState } from 'react';
import {
  DownloadIcon,
  PlusCircleIcon,
  useNotification,
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
} from '@openmsupply-client/common';
import { SupplierSearchModal } from '@openmsupply-client/system';
import { ListParams, usePurchaseOrderList } from '../api';

export const AppBarButtonsComponent: FC<{
  modalController: ToggleState;
  listParams: ListParams;
}> = ({ modalController }) => {
  const t = useTranslation();
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
        {/* <LoadingButton
          startIcon={<DownloadIcon />}
          isLoading={isLoading}
          variant="outlined"
          onClick={csvExport}
          disabled={EnvUtils.platform === Platform.Android}
          label={t('button.export')}
        /> */}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
