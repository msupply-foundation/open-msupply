import React, { FC } from 'react';
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
  useDialog,
  DialogButton,
  useNavigate,
} from '@openmsupply-client/common';
import { PatientRowFragment, usePatient } from '../api';
import { patientsToCsv } from '../utils';
import { CreatePatientView } from '../CreatePatientModal';
import { useCreatePatientStore } from '../hooks/useCreatePatientStore';

export const AppBarButtons: FC<{ sortBy: SortBy<PatientRowFragment> }> = ({
  sortBy,
}) => {
  const { success, error } = useNotification();
  const t = useTranslation('common');
  const { isLoading, mutateAsync } = usePatient.document.listAll(sortBy);
  const { Modal, showDialog, hideDialog } = useDialog();

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

  const { patient, setNewPatient } = useCreatePatientStore();
  const navigate = useNavigate();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-patient')}
          onClick={() => {
            showDialog();
          }}
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          onClick={csvExport}
          isLoading={isLoading}
        >
          {t('button.export', { ns: 'common' })}
        </LoadingButton>
      </Grid>
      <Modal
        title=""
        sx={{ maxWidth: '90%' }}
        okButton={
          <DialogButton
            variant="ok"
            disabled={patient === undefined}
            onClick={() => {
              hideDialog();
              if (patient) {
                navigate(patient.id);
              }
            }}
          />
        }
        cancelButton={
          <DialogButton
            variant="cancel"
            onClick={() => {
              setNewPatient(undefined);
              hideDialog();
            }}
          />
        }
        slideAnimation={false}
      >
        <CreatePatientView />
      </Modal>
    </AppBarButtonsPortal>
  );
};
