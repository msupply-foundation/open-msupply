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
  SortBy,
  UserPermission,
  useCallbackWithPermission,
  EnvUtils,
  Platform,
} from '@openmsupply-client/common';
import { PatientRowFragment, usePatient } from '../api';
import { patientsToCsv } from '../utils';
import { CreatePatientModal } from '../CreatePatientModal';
import { CreateNewPatient } from 'packages/programs/src';

interface AppBarButtonsComponentProps {
  onSavePatient: (patient: CreateNewPatient) => void;
  sortBy: SortBy<PatientRowFragment>;
}

export const AppBarButtons = ({
  onSavePatient,
  sortBy,
}: AppBarButtonsComponentProps) => {
  const { success, error } = useNotification();
  const t = useTranslation();
  const { isLoading, mutateAsync } = usePatient.document.listAll(sortBy);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const csvExport = async () => {
    const data = await mutateAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = patientsToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.patients'));
    success(t('success'))();
  };

  const onCreatePatient = useCallbackWithPermission(
    UserPermission.PatientMutate,
    () => setCreateModalOpen(true)
  );

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-patient')}
          onClick={onCreatePatient}
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          onClick={csvExport}
          isLoading={isLoading}
          disabled={EnvUtils.platform === Platform.Android}
          label={t('button.export')}
        />
      </Grid>

      {createModalOpen ? (
        <CreatePatientModal
          onClose={() => setCreateModalOpen(false)}
          onCreatePatient={onSavePatient}
        />
      ) : null}
    </AppBarButtonsPortal>
  );
};
