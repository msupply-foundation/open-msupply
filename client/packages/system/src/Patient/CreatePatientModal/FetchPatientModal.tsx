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
import { usePatient } from '../api';
import { mapSyncError, useSync } from '../../Sync';

interface FetchPatientModal {
  patient: PatientColumnData;
  onClose: () => void;
}

/**
 * UI Steps:
 * - Start: modal just opened; ask user to confirm to fetch patient
 * - Linking: name_store_join is about to be created
 * - Syncing: syncing patient data from central
 * - Synced: done
 */
type Step = 'Start' | 'Linking' | 'Syncing' | 'Synced';

const STATUS_POLLING_INTERVAL = 500;

/** Fetch a patient from central */
export const FetchPatientModal: FC<FetchPatientModal> = ({
  patient,
  onClose,
}) => {
  const t = useTranslation('dispensary');
  const { Modal, showDialog, hideDialog } = useDialog({ onClose });
  const { getLocalisedFullName } = useIntlUtils();
  const [step, setStep] = useState<Step>('Start');
  const [error, setError] = useState<string | undefined>(undefined);
  const { mutate: linkPatientToStore, data: patientStoreLink } =
    usePatient.utils.linkPatientToStore();
  const { mutateAsync: manualSync, data: manualSyncResult } =
    useSync.sync.manualSync();
  const { data: syncStatus } = useSync.utils.syncStatus(
    STATUS_POLLING_INTERVAL,
    !!manualSyncResult && step !== 'Synced'
  );

  useEffect(() => {
    showDialog();
    return () => {
      setStep('Start');
      setError(undefined);
      hideDialog();
      onClose();
    };
  }, []);

  useEffect(() => {
    switch (step) {
      case 'Linking':
        linkPatientToStore(patient.id);
        break;
      case 'Syncing': {
        manualSync();
        break;
      }
    }
  }, [patient.id, step]);

  useEffect(() => {
    if (step !== 'Linking' || !patientStoreLink) return;
    if (patientStoreLink.__typename === 'LinkPatientPatientToStoreError') {
      switch (patientStoreLink.error.__typename) {
        case 'ConnectionError': {
          setError(t('messages.failed-to-reach-central'));
          break;
        }
        default:
          noOtherVariants(patientStoreLink.error.__typename);
      }
      return;
    }
    setStep('Syncing');
  }, [step, patientStoreLink]);

  useEffect(() => {
    if (step !== 'Syncing' || !syncStatus) return;
    if (syncStatus.error) {
      const error = mapSyncError(
        t,
        syncStatus.error,
        'error.unknown-sync-error'
      );
      setError(error.error);
    } else if (!syncStatus.isSyncing) {
      setStep('Synced');
    }
  }, [step, syncStatus]);

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
            if (step === 'Start') {
              setStep('Linking');
            } else {
              hideDialog();
              setStep('Start');
              onClose();
            }
          }}
          disabled={(step !== 'Start' && step !== 'Synced') || !!error}
        />
      }
      cancelButton={
        <DialogButton
          variant="cancel"
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
