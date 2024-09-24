import {
  AppBarButtonsPortal,
  Grid,
  ReportContext,
  LoadingButton,
  PrinterIcon,
  useTranslation,
  UserStoreNodeFragment,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import { AddButton } from './AddButton';
import {
  ReportRowFragment,
  ReportSelector,
  usePrintReport,
} from '../../Report';
import { usePatient } from '../api';
import { JsonData, useProgramEnrolments } from '@openmsupply-client/programs';

export const AppBarButtons: FC<{
  disabled: boolean;
  store?: UserStoreNodeFragment;
}> = ({ disabled, store }) => {
  const t = useTranslation();
  const { print, isPrinting } = usePrintReport();
  const patientId = usePatient.utils.id();
  const printReport = (
    report: ReportRowFragment,
    args: JsonData | undefined
  ) => {
    print({ reportId: report.id, dataId: patientId, args });
  };
  const { data: enrolmentData } = useProgramEnrolments.document.list({
    filterBy: {
      patientId: { equalTo: patientId },
    },
  });
  const disableEncounterButton = enrolmentData?.nodes?.length === 0;
  if (!store?.preferences.omProgramModule) return null;

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        {store?.preferences.omProgramModule && (
          <AddButton
            disabled={disabled}
            disableEncounterButton={disableEncounterButton}
          />
        )}
        <ReportSelector context={ReportContext.Patient} onPrint={printReport}>
          <LoadingButton
            disabled={disabled}
            variant="outlined"
            startIcon={<PrinterIcon />}
            isLoading={isPrinting}
          >
            {t('button.print')}
          </LoadingButton>
        </ReportSelector>
      </Grid>
    </AppBarButtonsPortal>
  );
};
