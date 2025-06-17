import {
  AppBarButtonsPortal,
  Grid,
  ReportContext,
  UserStoreNodeFragment,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import { AddButton } from './AddButton';
import { ReportSelector } from '../../Report';
import { usePatient } from '../api';
import { useProgramEnrolments } from '@openmsupply-client/programs';

export const AppBarButtons: FC<{
  disabled: boolean;
  store?: UserStoreNodeFragment;
}> = ({ disabled, store }) => {
  const patientId = usePatient.utils.id();

  const { data: enrolmentData } = useProgramEnrolments.document.list({
    filterBy: {
      patientId: { equalTo: patientId },
    },
  });
  const disableEncounterButton = enrolmentData?.nodes?.length === 0;

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <AddButton
          disabled={disabled}
          disableEncounterButton={disableEncounterButton}
          store={store}
        />
        {store?.preferences.omProgramModule && (
          <ReportSelector
            dataId={patientId}
            context={ReportContext.Patient}
            disabled={disabled}
          />
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};
