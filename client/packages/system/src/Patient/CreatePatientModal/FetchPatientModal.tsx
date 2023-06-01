import React, { FC, useEffect, useState } from 'react';

import {
  noOtherVariants,
  useDialog,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';
import { PatientColumnData } from './PatientResultsTab';
import {
  BasicSpinner,
  DialogButton,
  ErrorWithDetails,
} from '@common/components';
import { usePatient } from '../api';

interface FetchPatientModal {
  patient: PatientColumnData;
  onClose: () => void;
}

/**
 * UI Steps:
 * - Start: modal just opened
 * - Confirmed: user confirmed to fetch patient
 * - Linked: name_store_join has been created
 * - Synced: patient data has been synced
 */
type Step = 'Start' | 'Confirmed' | 'Linked' | 'Synced';

/** Fetch a patient from central */
export const FetchPatientModal: FC<FetchPatientModal> = ({
  patient,
  onClose,
}) => {
  const { Modal, showDialog, hideDialog } = useDialog({ onClose });
  const { getLocalisedFullName } = useIntlUtils();
  const [step, setStep] = useState<Step>('Start');

  const {
    mutate: linkPatientToStore,
    data: patientStoreLink,
    isLoading,
  } = usePatient.utils.linkPatientToStore();
  const [error, setError] = useState<string | undefined>(undefined);
  const t = useTranslation('patients');

  useEffect(() => {
    showDialog();
    return () => {
      setStep('Start');
      hideDialog();
    };
  }, []);

  useEffect(() => {
    switch (step) {
      case 'Confirmed':
        linkPatientToStore(patient.id);
        break;
      case 'Linked': {
        // TODO implement sync
        setStep('Synced');
      }
    }
  }, [patient.id, step]);

  useEffect(() => {
    if (step !== 'Confirmed' || !patientStoreLink) return;
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
    setStep('Linked');
  }, [patientStoreLink]);

  return (
    <Modal
      title="Retrieve patient data from central server?"
      okButton={
        <DialogButton
          variant={step !== 'Synced' ? 'ok' : 'next'}
          onClick={() => {
            if (step === 'Start') {
              setStep('Confirmed');
            } else {
              hideDialog();
              setStep('Start');
            }
          }}
          disabled={step === 'Confirmed' || step === 'Linked'}
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
      <>
        Patient:
        {getLocalisedFullName(patient.firstName, patient.lastName)}
        {isLoading ? <BasicSpinner /> : null}
        {error ? <ErrorWithDetails error="" details={error} /> : null}
      </>
    </Modal>
  );
};
