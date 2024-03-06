import {
  noOtherVariants,
  useMutation,
  useQueryClient,
  useTranslation,
} from '@openmsupply-client/common';
import { mapSyncError, useSync } from '../../Sync';
import { useCallback, useEffect, useState } from 'react';
import { usePatientApi } from '../api/hooks/utils/usePatientApi';

export type Step = 'Start' | 'Linking' | 'Syncing' | 'Synced';
const STATUS_POLLING_INTERVAL = 500;

/**
 * Links the patient to the current store and sync the patient over.
 */
export const useFetchPatient = () => {
  const api = usePatientApi();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('Start');
  const t = useTranslation('dispensary');
  const [error, setError] = useState<string | undefined>(undefined);

  const { mutateAsync: linkPatientToStore } = useMutation((nameId: string) =>
    api.linkPatientToStore(nameId)
  );
  const { mutateAsync: manualSync, data: manualSyncResult } =
    useSync.sync.manualSync();
  const { data: syncStatus } = useSync.utils.syncStatus(
    STATUS_POLLING_INTERVAL,
    !!manualSyncResult && step !== 'Synced'
  );

  const mutateAsync = useCallback(
    async (patientId: string) => {
      setStep('Linking');
      const patientStoreLink = await linkPatientToStore(patientId);
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
      await manualSync();
    },
    [linkPatientToStore, manualSync, t]
  );

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
      // invalidate all patient queries
      queryClient.invalidateQueries(api.keys.list()).then(() => {
        setStep('Synced');
      });
    }
  }, [api.keys, queryClient, step, syncStatus, t]);

  return { mutateAsync, error, step };
};
