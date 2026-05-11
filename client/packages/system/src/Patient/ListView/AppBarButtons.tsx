import React, { useState } from 'react';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  SortBy,
  UserPermission,
  useCallbackWithPermission,
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
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
  const t = useTranslation();
  const { isLoading, mutateAsync } = usePatient.document.listAll(sortBy);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleClick = useCallbackWithPermission(
    UserPermission.PatientMutate,
    () => setCreateModalOpen(true)
  );

  const getCsvData = async () => {
    const data = await mutateAsync();
    return data?.nodes?.length ? patientsToCsv(data.nodes, t) : null;
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-patient')}
          onClick={handleClick}
        />
        <ExportSelector
          getCsvData={getCsvData}
          filename={t('filename.patients')}
          isLoading={isLoading}
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
