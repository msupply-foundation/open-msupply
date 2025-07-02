import React, { useState } from 'react';
import {
  DownloadIcon,
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  LoadingButton,
  SortBy,
  UserPermission,
  useCallbackWithPermission,
  useExportCSV,
} from '@openmsupply-client/common';
import { PatientRowFragment, usePatient } from '../api';
import { patientsToCsv } from '../utils';
import { CreatePatientModal } from '../CreatePatientModal';
import { CreateNewPatient } from 'packages/programs/src';

interface AppBarButtonsComponentProps {
  onCreatePatient: (newPatient: CreateNewPatient) => void;
  onSelectPatient: (selectedPatient: string) => void;
  sortBy: SortBy<PatientRowFragment>;
}

export const AppBarButtons = ({
  onCreatePatient,
  onSelectPatient,
  sortBy,
}: AppBarButtonsComponentProps) => {
  const { error } = useNotification();
  const t = useTranslation();
  const { isLoading, mutateAsync } = usePatient.document.listAll(sortBy);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const exportCSV = useExportCSV();

  const csvExport = async () => {
    const data = await mutateAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = patientsToCsv(data.nodes, t);
    exportCSV(csv, t('filename.patients'));
  };

  const handleClick = useCallbackWithPermission(
    UserPermission.PatientMutate,
    () => setCreateModalOpen(true)
  );

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-patient')}
          onClick={handleClick}
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          onClick={csvExport}
          isLoading={isLoading}
          label={t('button.export')}
        />
      </Grid>

      {createModalOpen ? (
        <CreatePatientModal
          onClose={() => setCreateModalOpen(false)}
          onCreatePatient={onCreatePatient}
          onSelectPatient={onSelectPatient}
        />
      ) : null}
    </AppBarButtonsPortal>
  );
};
