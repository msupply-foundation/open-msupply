import React, { FC, useEffect, useState } from 'react';

import {
  BasicTextInput,
  Box,
  InputWithLabelRow,
  Stack,
  noOtherVariants,
  useDialog,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';
import { PatientColumnData } from './PatientResultsTab';
import {
  DialogButton,
  ErrorWithDetails,
  InlineSpinner,
  Typography,
} from '@common/components';
import { useFetchPatient } from './useFetchPatient';

interface FetchPatientModal {
  patient: PatientColumnData;
  onClose: () => void;
}

/** Fetch a patient from central */
export const FetchPatientModal: FC<FetchPatientModal> = ({
  patient,
  onClose,
}) => {
  const t = useTranslation('dispensary');
  const { Modal, showDialog, hideDialog } = useDialog({ onClose });
  const { getLocalisedFullName } = useIntlUtils();
  const [started, setStarted] = useState(false);
  const { mutateAsync: fetchPatientToStore, step, error } = useFetchPatient();

  useEffect(() => {
    showDialog();
    return () => {
      hideDialog();
      onClose();
    };
  }, [hideDialog, onClose, showDialog]);

  const message = (() => {
    switch (step) {
      case 'Start':
        return t('messages.confirm-patient-retrieval', {
          name: getLocalisedFullName(patient.firstName, patient.lastName),
        });
      case 'Linking':
      case 'Syncing':
        return t('messages.fetching-patient-data');
      case 'Synced':
        return t('messages.fetching-patient-data-done');
      default:
        return noOtherVariants(step);
    }
  })();
  return (
    <Modal
      title={t('title.patient-retrieval-modal')}
      okButton={
        <DialogButton
          variant={step === 'Synced' ? 'ok' : 'next'}
          onClick={() => {
            if (!started) {
              setStarted(true);
              fetchPatientToStore(patient.id);
            } else {
              setStarted(false);
              hideDialog();
              onClose();
            }
          }}
          disabled={(step !== 'Start' && step !== 'Synced') || !!error}
        />
      }
      cancelButton={
        <DialogButton
          variant="cancel"
          disabled={step === 'Synced'}
          onClick={() => {
            onClose();
          }}
        />
      }
    >
      <Box
        height="100%"
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        alignItems="center"
      >
        <Stack alignItems="flex-start" gap={1} sx={{ paddingLeft: '20px' }}>
          <InputWithLabelRow
            label={t('label.patient-id')}
            Input={<BasicTextInput value={patient.code} disabled={true} />}
          />
          <InputWithLabelRow
            label={t('label.first-name')}
            Input={<BasicTextInput value={patient.firstName} disabled={true} />}
          />
          <InputWithLabelRow
            label={t('label.last-name')}
            Input={<BasicTextInput value={patient.lastName} disabled={true} />}
          />
          <InputWithLabelRow
            label={t('label.date-of-birth')}
            Input={
              <BasicTextInput value={patient.dateOfBirth} disabled={true} />
            }
          />
        </Stack>

        {error ? (
          <ErrorWithDetails error="" details={error} />
        ) : (
          <>
            {step === 'Linking' || step === 'Syncing' ? (
              <InlineSpinner />
            ) : null}
            <Typography>{message}</Typography>
          </>
        )}
      </Box>
    </Modal>
  );
};
