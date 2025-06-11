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
} from '@openmsupply-client/common';
import { CreatePatientModal } from '@openmsupply-client/system';
import { ListParams, usePurchaseOrderList } from '../api';

export const AppBarButtonsComponent: FC<{
  // modalController: ToggleState;
  listParams: ListParams;
}> = ({ listParams }) => {
  const t = useTranslation();
  const { success, error } = useNotification();
  const [patientModalOpen, setPatientModalOpen] = useState(false);

  const {
    query: { data, isLoading },
  } = usePurchaseOrderList(listParams);

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-prescription')}
          onClick={() => {}}
        />
        {/* <NewPrescriptionModal
          open={modalController.isOn}
          onClose={modalController.toggleOff}
          openPatientModal={onCreatePatient}
        /> */}
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
