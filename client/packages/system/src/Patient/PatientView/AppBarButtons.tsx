import {
  AppBarButtonsPortal,
  Grid,
  ReportContext,
  LoadingButton,
  PrinterIcon,
  useTranslation,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import { AddButton } from './AddButton';
import { ReportRowFragment, ReportSelector, useReport } from '../../Report';
import { usePatient } from '../api';
import { JsonData } from 'packages/programs/src';

export const AppBarButtons: FC = () => {
  const t = useTranslation('common');
  const { print, isPrinting } = useReport.utils.print();
  const patientId = usePatient.utils.id();
  const printReport = (
    report: ReportRowFragment,
    args: JsonData | undefined
  ) => {
    print({ reportId: report.id, dataId: patientId, args });
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <AddButton />
        <ReportSelector context={ReportContext.Patient} onClick={printReport}>
          <LoadingButton
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
