import {
  AppBarButtonsPortal,
  Grid,
  ReportContext,
  LoadingButton,
  PrinterIcon,
  useTranslation,
  ProgramEnrolmentNodeStatus,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import { AddButton } from './AddButton';
import { ReportRowFragment, ReportSelector, useReport } from '../../Report';
import { usePatient } from '../api';
import { JsonData, useProgramEnrolments } from '@openmsupply-client/programs';

export const AppBarButtons: FC<{ disabled: boolean }> = ({ disabled }) => {
  const t = useTranslation('common');
  const { print, isPrinting } = useReport.utils.print();
  const patientId = usePatient.utils.id();
  const printReport = (
    report: ReportRowFragment,
    args: JsonData | undefined
  ) => {
    print({ reportId: report.id, dataId: patientId, args });
  };
  const { data: enrolmentData } =
    useProgramEnrolments.document.programEnrolments({
      filterBy: {
        patientId: { equalTo: patientId },
        status: { equalTo: ProgramEnrolmentNodeStatus.Active },
      },
    });
  const disableEncounterButton = enrolmentData?.nodes?.length === 0;

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <AddButton
          disabled={disabled}
          disableEncounterButton={disableEncounterButton}
        />
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
