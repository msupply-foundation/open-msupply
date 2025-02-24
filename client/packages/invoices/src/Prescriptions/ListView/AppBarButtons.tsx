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
  ToggleState,
  EnvUtils,
  Platform,
  useCallbackWithPermission,
  UserPermission,
} from '@openmsupply-client/common';
import { CreatePatientModal } from '@openmsupply-client/system';
import { ListParams, usePrescriptionList } from '../api';
import { prescriptionToCsv } from '../../utils';
import { NewPrescriptionModal } from './NewPrescriptionModal';

export const AppBarButtonsComponent: FC<{
  modalController: ToggleState;
  listParams: ListParams;
}> = ({ modalController, listParams }) => {
  const t = useTranslation();
  const { success, error } = useNotification();
  const [patientModalOpen, setPatientModalOpen] = useState(false);

  const {
    query: { data, isLoading },
  } = usePrescriptionList(listParams);

  const onCreatePatient = useCallbackWithPermission(
    UserPermission.PatientMutate,
    () => setPatientModalOpen(true)
  );

  const csvExport = async () => {
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = prescriptionToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.prescriptions'));
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-prescription')}
          onClick={modalController.toggleOn}
        />
        <NewPrescriptionModal
          open={modalController.isOn}
          onClose={modalController.toggleOff}
          openPatientModal={onCreatePatient}
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          isLoading={isLoading}
          variant="outlined"
          onClick={csvExport}
          disabled={EnvUtils.platform === Platform.Android}
          label={t('button.export')}
        />
        {patientModalOpen && (
          <CreatePatientModal onClose={() => setPatientModalOpen(false)} />
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
