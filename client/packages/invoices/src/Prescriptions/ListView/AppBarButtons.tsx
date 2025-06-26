import React, { useState } from 'react';
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
  useNavigate,
  RouteBuilder,
  FnUtils,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { CreateNewPatient } from '@openmsupply-client/programs';
import { CreatePatientModal } from '@openmsupply-client/system';
import { ListParams, usePrescription, usePrescriptionList } from '../api';
import { prescriptionToCsv } from '../../utils';
import { NewPrescriptionModal } from './NewPrescriptionModal';

interface AppBarButtonsComponentProps {
  modalController: ToggleState;
  listParams: ListParams;
}

export const AppBarButtonsComponent = ({
  modalController,
  listParams,
}: AppBarButtonsComponentProps) => {
  const t = useTranslation();
  const { success, error } = useNotification();
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const navigate = useNavigate();

  const {
    query: { data, isLoading },
  } = usePrescriptionList(listParams);

  const {
    create: { create: createPrescription },
  } = usePrescription();

  const handleClick = useCallbackWithPermission(
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

  const onCreatePatient = (newPatient: CreateNewPatient) => {
    navigate(
      RouteBuilder.create(AppRoute.Dispensary)
        .addPart(AppRoute.Patients)
        .addPart(newPatient.id)
        .addQuery({ previousPath: AppRoute.Prescription })
        .build()
    );
  };

  const onSelectPatient = async (selectedPatient: string) => {
    const invoice = await createPrescription({
      id: FnUtils.generateUUID(),
      patientId: selectedPatient,
    });
    navigate(
      RouteBuilder.create(AppRoute.Dispensary)
        .addPart(AppRoute.Prescription)
        .addPart(invoice?.id ?? '')
        .build()
    );
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
          openPatientModal={handleClick}
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
          <CreatePatientModal
            onClose={() => setPatientModalOpen(false)}
            onCreatePatient={newPatient => onCreatePatient(newPatient)}
            onSelectPatient={selectedPatient =>
              onSelectPatient(selectedPatient)
            }
          />
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
