import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  ClockIcon,
  DialogButton,
  useDialog,
  DetailContainer,
  Box,
  Typography,
  ReportContext,
  LoadingButton,
  PrinterIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { DocumentHistory } from '../DocumentHistory';
import { AddButton } from './AddButton';
import { usePatientStore } from '../hooks';
import { ReportRowFragment, ReportSelector, useReport } from '../../Report';
import { usePatient } from '../api';

export const AppBarButtons: FC = () => {
  const { Modal, showDialog, hideDialog } = useDialog();
  const { documentName } = usePatientStore();
  const t = useTranslation('common');
  const { print, isPrinting } = useReport.utils.print();
  const patientId = usePatient.utils.id();
  const printReport = (report: ReportRowFragment) => {
    print({ reportId: report.id, dataId: patientId });
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <AddButton />
        <ButtonWithIcon
          Icon={<ClockIcon />}
          label={'History'}
          disabled={documentName === undefined}
          onClick={showDialog}
        />
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
      <Modal
        title=""
        sx={{ maxWidth: '90%', minHeight: '95%' }}
        okButton={<DialogButton variant="ok" onClick={hideDialog} />}
        slideAnimation={false}
      >
        <DetailContainer>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap={2}
          >
            <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
              Document Edit History
            </Typography>
            {documentName ? (
              <DocumentHistory documentName={documentName} />
            ) : null}
          </Box>
        </DetailContainer>
      </Modal>
    </AppBarButtonsPortal>
  );
};
