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
import { PatientColumnData } from '../CreatePatientModal/PatientResultsTab';

interface AppBarButtonsComponentProps {
  onCreatePatient: () => void;
  onSelectPatient: (selectedPatient: PatientColumnData) => void;
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
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onCreate={onCreatePatient}
          onSelectPatient={onSelectPatient}
        />
      ) : null}
    </AppBarButtonsPortal>
  );
};
