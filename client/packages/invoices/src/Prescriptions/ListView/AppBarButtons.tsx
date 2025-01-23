import React, { FC, useEffect, useState } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import {
  DownloadIcon,
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  FnUtils,
  FileUtils,
  LoadingButton,
  ToggleState,
  EnvUtils,
  Platform,
  useNavigate,
  RouteBuilder,
  useCallbackWithPermission,
  UserPermission,
  useSearchParams,
} from '@openmsupply-client/common';
import {
  CreatePatientModal,
  PatientSearchModal,
} from '@openmsupply-client/system';
import { ListParams, usePrescriptionList, usePrescription } from '../api';
import { prescriptionToCsv } from '../../utils';

export const AppBarButtonsComponent: FC<{
  modalController: ToggleState;
  listParams: ListParams;
}> = ({ modalController, listParams }) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success, error } = useNotification();
  const [patientModalOpen, setPatientModalOpen] = useState(false);

  const {
    create: { create },
  } = usePrescription();

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

  async function handlePatientUpdate(patientId: string): Promise<void> {
    try {
      console.log('patientId', patientId);
      const invoiceNumber = await create({
        id: FnUtils.generateUUID(),
        patientId,
      });
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.Prescription)
          .addPart(String(invoiceNumber))
          .build()
      );
    } catch (e) {
      const errorSnack = error(
        t('error.failed-to-create-prescription') + (e as Error).message
      );
      errorSnack();
    }
  }

  useEffect(() => {
    const patientId = searchParams.get('patientId');
    if (patientId) {
      handlePatientUpdate(patientId);
    }
  }, []);

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-prescription')}
          onClick={modalController.toggleOn}
        />
        <PatientSearchModal
          open={modalController.isOn}
          onClose={modalController.toggleOff}
          onChange={async name => {
            modalController.toggleOff();
            console.log('name', name);
            // await handlePatientUpdate(name.id);
          }}
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
